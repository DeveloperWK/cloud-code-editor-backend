import { Socket } from "socket.io";
import { getProjectHostPath } from "../utils/supabaseFileManager";
import { fileOperations } from "./init";

const handleFileCreate = async (socket: Socket) => {
  socket.on("file:create", async (fileName: string) => {
    try {
      const { projectId } = socket.data;
      const hostPath = getProjectHostPath(projectId);
      let filePath = undefined;
      await fileOperations.createFile(fileName, projectId, filePath);
      socket.emit("fileCreated", { projectId, fileName });
    } catch (error) {
      console.error(error);
      socket.emit("error", { message: "Failed to create file" });
    }
  });
};
export default handleFileCreate;
