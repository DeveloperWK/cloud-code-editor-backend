import path from "node:path";
import fse from "fs-extra";
import { getProjectHostPath } from "../utils/supabaseFileManager";
import cleanedPath from "../utils/cleanedPath";
class FileOperations {
  public async createFile(
    fileName: string,
    projectId: string,
    filepath?: string | undefined,
  ) {
    try {
      const mainFilePath = path.join(
        cleanedPath(projectId, filepath),
        fileName,
      );
      await fse.ensureFile(mainFilePath);
      console.log(`File ${fileName} created successfully`);
    } catch (error) {
      console.error(`Error creating file ${fileName}: ${error}`);
    }
  }
  public async createDir(
    dirName: string,
    projectId: string,
    dirPath?: string | undefined,
  ) {
    try {
      const mainDirPath = path.join(cleanedPath(projectId, dirPath), dirName);
      await fse.ensureDir(mainDirPath);
      console.log(`Directory ${dirName} created successfully`);
    } catch (error) {
      console.error(`Error creating directory ${dirName}: ${error}`);
    }
  }
  public async removeFileOrDir(rmPath: string, projectId: string) {
    try {
      const mPath = cleanedPath(rmPath, projectId);
      if (await fse.exists(mPath)) {
        await fse.remove(mPath);
        console.log(`File or directory removed successfully`);
      }
    } catch (error) {
      console.error(`Error removing file or directory: ${error}`);
    }
  }
}
export default FileOperations;
