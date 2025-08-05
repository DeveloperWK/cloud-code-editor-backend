import path from "node:path";
import fse from "fs-extra";
import { getProjectHostPath } from "../utils/supabaseFileManager";
import getAbsolutePath from "../utils/cleanedPath";
class FileOperations {
  public async createFile(
    fileName: string,
    projectId: string,
    filepath?: string | undefined,
  ) {
    try {
      const mainFilePath = path.join(
        getAbsolutePath(projectId, filepath),
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
      const mainDirPath = path.join(
        getAbsolutePath(projectId, dirPath),
        dirName,
      );
      await fse.ensureDir(mainDirPath);
      console.log(`Directory ${dirName} created successfully`);
    } catch (error) {
      console.error(`Error creating directory ${dirName}: ${error}`);
    }
  }
  public async removeFileOrDir(rmPath: string, projectId: string) {
    try {
      const mPath = getAbsolutePath(projectId, rmPath);
      if (await fse.exists(mPath)) {
        await fse.remove(mPath);
        console.log(`File or directory removed successfully`);
      }
    } catch (error) {
      console.error(`Error removing file or directory: ${error}`);
    }
  }
  public async linePatch(
    patchPath: string,
    patch: {
      action: string;
      startLine: number;
      endLine: number;
      lines: string[];
    },
    projectId: string,
  ) {
    try {
      const absPath = getAbsolutePath(projectId, patchPath);
      const file = await fse.readFile(absPath, "utf8");
      const lines = file.split("\n");
      if (patch.action === "append") {
        lines.push(...patch.lines);
      } else {
        lines.splice(
          patch.startLine,
          patch.endLine - patch.startLine,
          ...patch.lines,
        );
      }
      await fse.writeFile(absPath, lines.join("\n"));
    } catch (error) {
      console.error(`Error removing file or directory: ${error}`);
    }
  }
  public async readFile(filePath: string, projectId: string) {
    try {
      const absPath = getAbsolutePath(projectId, filePath);
      const file = await fse.readFile(absPath, "utf8");
      const stats = await fse.stat(absPath);
      const fileExt = path.extname(filePath).toLowerCase();
      const fileType = fileExt ? fileExt.slice(1) : "unknown";
      return {
        content: file,
        metadata: {
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          isFile: stats.isFile(),
          fileType: fileType,
          fileExtension: fileExt,
        },
      };
    } catch (error) {
      console.error(`Error reading file: ${error}`);
    }
  }

  public async writeFile(filePath: string, content: string, projectId: string) {
    try {
      const absPath = getAbsolutePath(projectId, filePath);
      await fse.ensureFile(path.dirname(absPath));
      if (content.length > 1024 * 1024) {
        return this.writeLargeFile(absPath, content);
      } else {
        return await this.writeSmallFile(absPath, content);
      }
    } catch (error) {
      console.error(`Error writing file: ${error}`);
    }
  }
  private async writeSmallFile(absPath: string, content: string) {
    try {
      await fse.writeFile(absPath, content, { encoding: "utf8" });
    } catch (error) {
      console.error(`Error writing small file: ${error}`);
    }
  }
  private async writeLargeFile(absPath: string, content: string) {
    try {
      const tempPath = `${absPath}.tmp`;
      const writeStream = fse.createWriteStream(tempPath, { encoding: "utf8" });
      return new Promise((resolve, reject) => {
        writeStream.on("finish", async () => {
          try {
            await fse.move(tempPath, absPath, { overwrite: true });
            resolve(true);
          } catch (error) {
            console.error(`Error moving file: ${error}`);
            await fse.remove(tempPath).catch(() => {});
            reject(error);
          }
        });
        writeStream.on("error", async (error) => {
          await fse.remove(tempPath).catch(() => {});
          reject(error);
        });
        writeStream.write(content);
        writeStream.end();
      });
    } catch (error) {
      console.error(`Error writing large file: ${error}`);
    }
  }
  private async getFileSize(filePath: string, projectId: string) {
    try {
      const absPath = getAbsolutePath(projectId, filePath);
      const stats = await fse.stat(absPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }
}
export default FileOperations;
