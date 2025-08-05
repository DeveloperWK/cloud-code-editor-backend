import { Socket } from "socket.io";
import { fileOperations } from "./init";

const writeFileHandler = async (socket: Socket) => {
  socket.on("file:write", async ({ path, content }) => {
    console.log(`path: ${path}`);
    try {
      const { projectId } = socket.data;
      await fileOperations.writeFile(path, content, projectId);
    } catch (error) {
      console.error(error);
    }
  });
};
export default writeFileHandler;
