import { Socket } from "socket.io";
import handleInit from "./fileSystemManagement/init";
import { io } from "./index";

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
