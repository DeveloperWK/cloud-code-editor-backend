import { Socket } from "socket.io";
import handleFileCreate from "./file";
import handleDirCreate from "./dir";
import FileOperations from "../classes/fileOperations";
import lineHandler from "./line";
import readFileHandler from "./read";
import writeFileHandler from "./write";
export const fileOperations = new FileOperations();
const handleInit = async (socket: Socket) => {
  socket.on("init", async (data) => {
    if (!Buffer.isBuffer(data)) {
      console.log("Not a buffer! Got:", typeof data);
      return;
    }
    console.log("Raw buffer received:", data);
    let offset = 0;
    const decodeString = () => {
      const len = data.readUInt8(offset);
      offset += 1;
      const str = data.subarray(offset, offset + len).toString("utf-8");
      offset += len;
      return str;
    };

    const userId = decodeString();
    const projectId = decodeString();
    const containerId = decodeString();

    console.log("init project", { userId, projectId, containerId });

    socket.data.userId = userId;
    socket.data.projectId = projectId;
    socket.data.containerId = containerId;
    socket.join(`project:${projectId}`);

    await handleFileCreate(socket);
    await handleDirCreate(socket);
    await lineHandler(socket);
    await readFileHandler(socket);
    await writeFileHandler(socket);

    socket.emit("init:ack");
  });
};
export default handleInit;
