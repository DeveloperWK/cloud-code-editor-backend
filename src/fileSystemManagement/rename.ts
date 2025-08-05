import { Socket } from "socket.io";
import { fileOperations } from "./init";

const handleRenameFile = async (socket: Socket) => {
  socket.on("file:rename", async (oldPath, newPath) => {
    try {
      const { projectId } = socket.data;
      await fileOperations.renameFile(oldPath, newPath, projectId);
    } catch (error) {
      console.error(error);
      socket.emit("error", { message: "Failed to rename file" });
    }
  });
};
export default handleRenameFile;
