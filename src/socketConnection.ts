import { Socket } from "socket.io";
import { io } from "./index";
import handleInit from "./fileSystemManagement/init";
import handleFileCreate from "./fileSystemManagement/file";
import handleDirCreate from "./fileSystemManagement/dir";

const socketConnection = () => {
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    handleInit(socket);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
export default socketConnection;
