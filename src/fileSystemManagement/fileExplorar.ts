import { Socket } from "socket.io";
import { fileOperations } from "./init";

const handleFileExplorar = async (socket: Socket) => {
  try {
    socket.on("file:list", async (path) => {
      const { projectId } = socket.data;
      const children = await fileOperations.FileExplorer(projectId, path);
      console.log(children);
      socket.emit("file:list", { parent: path, children });
    });
  } catch (error) {
    console.error(error);
    socket.emit("file:list", { children: [] });
  }
};

export default handleFileExplorar;
