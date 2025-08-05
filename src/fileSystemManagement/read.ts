import { Socket } from "socket.io";
import { fileOperations } from "./init";

const readFileHandler = async (socket: Socket) => {
  socket.on("file:read", async (path) => {
    console.log(`path: ${path}`);
    try {
      const { projectId } = socket.data;
      const content = await fileOperations.readFile(path, projectId);
      socket.emit("file:read", content);
    } catch (error) {
      console.error(error);
    }
  });
};
export default readFileHandler;
