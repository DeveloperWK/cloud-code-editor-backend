import path from "node:path";
import fse from "fs-extra";
import { getProjectHostPath } from "../utils/supabaseFileManager";
import getAbsolutePath from "../utils/cleanedPath";
import { LinePatch } from "../types";
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
  public async removeFile(rmPath: string, projectId: string) {
    try {
      const mPath = getAbsolutePath(projectId, rmPath);
      if (await fse.exists(mPath)) {
        await fse.remove(mPath);
        console.log(`File removed successfully`);
      }
    } catch (error) {
      console.error(`Error removing file or directory: ${error}`);
    }
  }
  public async removeDir(rmPath: string, projectId: string) {
    try {
      const mPath = getAbsolutePath(projectId, rmPath);
      if (await fse.exists(mPath)) {
        await fse.remove(mPath);
        console.log(`Directory removed successfully`);
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
  public async renameFile(oldPath: string, newPath: string, projectId: string) {
    try {
      const absOldPath = getAbsolutePath(projectId, oldPath);
      const absNewPath = getAbsolutePath(projectId, newPath);
      await fse.move(absOldPath, absNewPath, { overwrite: true });
      return true;
    } catch (error) {
      console.error(`Error renaming file : ${error}`);
      return false;
    }
  }
  public async renameFolder(
    oldPath: string,
    newPath: string,
    projectId: string,
  ) {
    try {
      const absOldPath = getAbsolutePath(projectId, oldPath);
      const absNewPath = getAbsolutePath(projectId, newPath);
      await fse.move(absOldPath, absNewPath, { overwrite: true });
      return true;
    } catch (error) {
      console.error(`Error renaming folder: ${error}`);
      return false;
    }
  }

  public async listFileOrFolder(projectId: string, path: string) {
    try {
      const absPath = getAbsolutePath(projectId, path);
      const filesOrFolders = await fse.readdir(absPath);
      return filesOrFolders;
    } catch (error) {
      console.error(`Error listing files or folders: ${error}`);
      return [];
    }
  }
  public async applyLinePatchToFile(filePath: string, patch: LinePatch) {
    let lines: string[] = [];
    try {
      const fileContent = await fse.readFile(filePath, "utf8");
      lines = fileContent.split("\n");
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.warn(`⚠️ File not found, creating new file: ${filePath}`);
        lines = [];
      } else {
        console.error(`Error reading file: ${error}`);
      }
    }
    const totalLines = lines.length;
    if (patch.startLine < 0) {
      throw new Error(
        `Invalid patch: startLine (${patch.startLine}) cannot be negative.`,
      );
    }

    if (patch.action === "append") {
      if (patch.startLine > totalLines) {
        throw new Error(
          `Invalid patch: append startLine (${patch.startLine}) exceeds file line count (${totalLines}).`,
        );
      }

      lines.splice(patch.startLine, 0, ...patch.lines);
    } else if (patch.action === "replace") {
      if (patch.endLine! < patch.startLine) {
        throw new Error(
          `Invalid patch: endLine (${patch.endLine}) is before startLine (${patch.startLine}).`,
        );
      }

      if (patch.startLine > totalLines || patch.endLine! > totalLines) {
        throw new Error(
          `Invalid patch: startLine (${patch.startLine}) or endLine (${patch.endLine}) exceeds file line count (${totalLines}).`,
        );
      }

      lines.splice(
        patch.startLine,
        patch.endLine! - patch.startLine,
        ...patch.lines,
      );
    }

    const updatedContent = lines.join("\n");
    await fse.writeFile(filePath, updatedContent, { encoding: "utf8" });
    return updatedContent;
  }
}
export default FileOperations;
