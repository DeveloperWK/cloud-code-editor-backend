import { Socket } from "socket.io";
import { fileOperations } from "./init";

const handleDirCreate = async (socket: Socket) => {
  socket.on("dir:create", async (dirName: string) => {
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
export default handleDirCreate;
