import path from "node:path";
import * as fse from "fs-extra";
import spbClient from "../config/supabase.config";
import joinSupabasePath from "./joinSupabasePath";
import listAllFilesRecursive from "./listAllFilesRecursive";
const BUCKET_NAME = "cloud-code-editor";
const PROJECT_HOST_PATH = process.env._DOCKER_HOST_PATH_PREFIX as string;

const getProjectHostPath = (projectID: string): string => {
  const pPath = path.join(PROJECT_HOST_PATH, projectID);
  fse.mkdirSync(PROJECT_HOST_PATH, { recursive: true });
  return pPath;
};
const downloadProjectFiles = async (
  userID: string,
  projectID: string,
): Promise<void> => {
  const hostPath = getProjectHostPath(projectID);
  const supabaseStoragePath = `${userID}/${projectID}`;
  console.log(`[DL] Downloading files for ${projectID} to ${hostPath}`);
  await fse.emptyDir(hostPath);

  try {
    const allFilePaths = await listAllFilesRecursive(supabaseStoragePath);
    if (!allFilePaths || allFilePaths.length === 0) {
      console.log(`[DL] No files found in Supabase Storage for ${projectID}.`);
      return;
    }
    for (const filePath of allFilePaths) {
      const relativePath = filePath.replace(`${supabaseStoragePath}/`, "");
      const destFilePath = path.join(hostPath, relativePath);
      await fse.ensureDir(path.dirname(destFilePath));
      const { data, error: downloadError } = await spbClient.storage
        .from(BUCKET_NAME)
        .download(filePath);
      if (downloadError) {
        console.error(`[DL] Error downloading ${filePath}:`, downloadError);
        continue; // Continue to next file
      }
      if (data) {
        await fse.writeFile(
          destFilePath,
          Buffer.from(await data.arrayBuffer()),
        );
        console.log(`[DL] Downloaded: ${filePath} to ${destFilePath}`);
      }
    }
    console.log(`[DL] Successfully downloaded all files for ${projectID}.`);
  } catch (err) {
    console.error(
      `[DL] Failed to download files for project ${projectID}:`,
      err,
    );
    throw new Error(
      `Failed to download files for project ${projectID}: ${(err as Error).message}`,
    );
  }
};
const uploadProjectFiles = async (
  userID: string,
  projectID: string,
): Promise<void> => {
  const hostPath = getProjectHostPath(projectID);
  const supabaseStorageBasePath = `${userID}/${projectID}`;
  console.log(`[UL] Uploading files for ${projectID} from ${hostPath}`);
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
        `Failed to list files for project ${projectID}: ${listError?.message}`,
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
          `Failed to delete files for project ${projectID}: ${deleteError?.message}`,
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
      const supabaseFilePath = path.posix.join(
        supabaseStorageBasePath,
        file.relativePath,
      );
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
      console.log(`[UL] Successfully uploaded all files for ${projectID}.`);
    }
  } catch (e) {
    console.error(
      `[UL] Failed to upload files for playground ${projectID}:`,
      e,
    );
    throw new Error(
      `Failed to upload files for playground ${projectID}: ${(e as Error).message}`,
    );
  }
};

const copySupabaseStorageFolder = async (
  sourceSupabasePath: string,
  destinationSupabasePath: string,
): Promise<void> => {
  console.log(
    `[SUPA_COPY] Copying from ${sourceSupabasePath} to ${destinationSupabasePath}`,
  );
  try {
    const files = await listAllFilesRecursive(sourceSupabasePath);

    if (!files || files.length === 0) {
      console.warn(
        `[SUPA_COPY] No files found in source template path: ${sourceSupabasePath}`,
      );
      return;
    }
    for (const filePath of files) {
      const relativePath = filePath.replace(`${sourceSupabasePath}/`, "");
      const destPath = path.posix.join(destinationSupabasePath, relativePath);
      const { error } = await spbClient.storage
        .from(BUCKET_NAME)
        .copy(filePath, destPath);
      if (error) {
        console.error(
          `[SUPA_COPY] Error copying ${filePath} to ${destPath}`,
          error,
        );
      } else {
        console.log(`[SUPA_COPY] Copied: ${filePath} → ${destPath}`);
      }
      // Supabase Storage copy API
    }
  } catch (error) {
    console.error(
      `[SUPA_COPY] Error copying files from ${sourceSupabasePath} to ${destinationSupabasePath}:`,
      error,
    );
    throw new Error(
      `Failed to copy files from ${sourceSupabasePath} to ${destinationSupabasePath}: ${(error as Error).message}`,
    );
  }
};

export {
  getProjectHostPath,
  downloadProjectFiles,
  uploadProjectFiles,
  copySupabaseStorageFolder,
};
