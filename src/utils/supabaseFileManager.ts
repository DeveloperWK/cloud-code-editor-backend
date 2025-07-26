import path from "node:path";
import * as fse from "fs-extra";
import spbClient from "../config/supabase.config";
const BUCKET_NAME = "project-files";
const PROJECT_HOST_PATH = process.env._DOCKER_HOST_PATH_PREFIX as string;

const getProjectHostPath = (playgroundID: string): string => {
  const pPath = path.join(PROJECT_HOST_PATH, playgroundID);
  fse.mkdirSync(PROJECT_HOST_PATH, { recursive: true });
  return pPath;
};
const downloadProjectFiles = async (
  userID: string,
  playgroundID: string,
): Promise<void> => {
  const hostPath = getProjectHostPath(playgroundID);
  const supabaseStoragePath = `${userID}/${playgroundID}/`;
  console.log(`[DL] Downloading files for ${playgroundID} to ${hostPath}`);
  await fse.emptyDir(hostPath);

  try {
    const { data: files, error } = await spbClient.storage
      .from(BUCKET_NAME)
      .list(supabaseStoragePath);
    if (error) throw new Error(error?.message);
    if (!files || files.length === 0) {
      console.log(
        `[DL] No files found in Supabase Storage for ${playgroundID}.`,
      );
      return;
    }
    for (const file of files) {
      if (file.id) {
        const downloadPath = `${supabaseStoragePath}${file.name}`;
        const destFilePath = path.join(hostPath, file.name);
        await fse.ensureDir(path.dirname(destFilePath));
        const { data, error: downloadError } = await spbClient.storage
          .from(BUCKET_NAME)
          .download(downloadPath);
        if (downloadError) {
          console.error(
            `[DL] Error downloading ${downloadPath}:`,
            downloadError,
          );
          continue; // Continue to next file
        }
        if (data) {
          await fse.writeFile(
            destFilePath,
            Buffer.from(await data.arrayBuffer()),
          );
          console.log(`[DL] Downloaded: ${downloadPath} to ${destFilePath}`);
        }
      }
    }
    console.log(`[DL] Successfully downloaded all files for ${playgroundID}.`);
  } catch (err) {
    console.error(
      `[DL] Failed to download files for playground ${playgroundID}:`,
      err,
    );
    throw new Error(
      `Failed to download files for playground ${playgroundID}: ${(err as Error).message}`,
    );
  }
};
const uploadProjectFiles = async (
  userID: string,
  playgroundID: string,
): Promise<void> => {
  const hostPath = getProjectHostPath(playgroundID);
  const supabaseStorageBasePath = `${userID}/${playgroundID}/`;
  console.log(`[UL] Uploading files for ${playgroundID} from ${hostPath}`);
  if (!(await fse.pathExists(hostPath))) {
    console.warn(`[UL] Host path ${hostPath} does not exist. Skipping upload.`);
    return;
  }
  try {
    const { data: existingFiles, error: listError } = await spbClient.storage
      .from(BUCKET_NAME)
      .list(supabaseStorageBasePath);
    if (listError) {
      console.error(`[UL] Error listing files: ${listError}`);
      throw new Error(
        `Failed to list files for playground ${playgroundID}: ${listError?.message}`,
      );
    }
    const filesToDelete = existingFiles
      ?.filter((file) => file.id)
      .map((file) => `${supabaseStorageBasePath}${file.name}`);
    if (filesToDelete && filesToDelete.length > 0) {
      console.log(
        `[UL] Deleting ${filesToDelete.length} existing files from Supabase Storage.`,
      );
      const { error: deleteError } = await spbClient.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete);
      if (deleteError) {
        console.error(`[UL] Error deleting files: ${deleteError}`);
        throw new Error(
          `Failed to delete files for playground ${playgroundID}: ${deleteError?.message}`,
        );
      }
    }
    const fileToUpload: { fullPath: string; relativePath: string }[] = [];
    async function readDirRecursive(
      currentHostDir: string,
      currentRelativePath: string,
    ) {
      const items = await fse.readdir(currentHostDir);
      for (const item of items) {
        const itemFullPath = path.join(currentHostDir, item);
        const itemRelativePath = path.join(currentRelativePath, item);
        const stats = await fse.stat(itemFullPath);
        if (stats.isFile()) {
          fileToUpload.push({
            fullPath: itemFullPath,
            relativePath: itemRelativePath,
          });
        } else if (stats.isDirectory()) {
          await readDirRecursive(itemFullPath, itemRelativePath);
        }
      }
    }
    await readDirRecursive(hostPath, "");
    if (fileToUpload.length === 0) {
      console.log(`[UL] No files to upload from host path ${hostPath}.`);
      return;
    }
    for (const file of fileToUpload) {
      const fileContent = await fse.readFile(file.fullPath, {
        encoding: "utf8",
      });
      const supabaseFilePath = `${supabaseStorageBasePath}${file.relativePath}`;
      const { error: uploadError } = await spbClient.storage
        .from(BUCKET_NAME)
        .upload(supabaseFilePath, fileContent, {
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadError) {
        console.error(
          `[UL] Error uploading file ${file.fullPath}: ${uploadError}`,
        );
        throw new Error(
          `Failed to upload file ${file.fullPath}: ${uploadError?.message}`,
        );
      } else {
        console.log(`[UL] Uploaded: ${supabaseFilePath}`);
      }
      console.log(`[UL] Successfully uploaded all files for ${playgroundID}.`);
    }
  } catch (e) {
    console.error(
      `[UL] Failed to upload files for playground ${playgroundID}:`,
      e,
    );
    throw new Error(
      `Failed to upload files for playground ${playgroundID}: ${(e as Error).message}`,
    );
  }
};
export { getProjectHostPath, downloadProjectFiles, uploadProjectFiles };
