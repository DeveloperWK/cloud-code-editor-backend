import { Socket } from "socket.io";
import { fileOperations } from "./init";

const handleRemoveFile = async (socket: Socket) => {
  socket.on("file:delete", async (rmPath) => {
    try {
      const { projectId } = socket.data;
      await fileOperations.removeFile(rmPath, projectId);
    } catch (error) {
      console.error(error);
      socket.emit("error", { message: "Failed to delete file" });
    }
  });
};

export default handleRemoveFile;
