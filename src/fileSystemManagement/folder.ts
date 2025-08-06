import { Socket } from "socket.io";
import { fileOperations } from "./init";

const handleDirCreate = async (socket: Socket) => {
  socket.on("folder:create", async (dirName: string) => {
    try {
      const { projectId } = socket.data;
      console.log(`dir : ${projectId}`);
      let dirPath = undefined;
      await fileOperations.createDir(dirName, projectId, dirPath);
      socket.emit("dirCreated", { projectId, dirName });
    } catch (error) {
      console.error(error);
      socket.emit("error", { message: "Failed to create directory" });
    }
  });
};
const handleRenameDir = async (socket: Socket) => {
  socket.on("folder:rename", async ({ oldPath, newPath }) => {
    try {
      const { projectId } = socket.data;
      await fileOperations.renameFolder(oldPath, newPath, projectId);
    } catch (error) {
      console.error(error);
      socket.emit("error", { message: "Failed to rename directory" });
    }
  });
};
const handleRemoveDir = async (socket: Socket) => {
  socket.on("folder:delete", async (rmPath) => {
    try {
      const { projectId } = socket.data;
      await fileOperations.removeDir(rmPath, projectId);
    } catch (error) {
      console.error(error);
      socket.emit("error", { message: "Failed to delete directory" });
    }
  });
};
export { handleDirCreate, handleRemoveDir, handleRenameDir };
