import { Socket } from "socket.io";
import { fileOperations } from "./init";

const lineHandler = async (socket: Socket) => {
  socket.on("file:linePatch", async ({ path, patch }) => {
    console.log(patch);
    try {
      const { projectId } = socket.data;
      await fileOperations.linePatch(path, patch, projectId);
      socket.emit("file:linePatch", { path, patch });
    } catch (error) {
      console.error(error);
    }
  });
};
export default lineHandler;
