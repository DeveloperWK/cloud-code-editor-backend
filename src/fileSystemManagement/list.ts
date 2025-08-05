import { Socket } from "socket.io";
import { fileOperations } from "./init";

const handleListFilesOrFolders = async (socket: Socket) => {
  try {
    socket.on("file:list", async (path) => {
      const { projectId } = socket.data;
      const listFiles = await fileOperations.listFileOrFolder(projectId, path);

      socket.emit("file:list", listFiles);
    });
  } catch (error) {
    console.error(error);
    socket.emit("file:list", []);
  }
};

export default handleListFilesOrFolders;
