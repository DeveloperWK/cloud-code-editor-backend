import { configDotenv } from "dotenv";
import { Socket } from "socket.io";
import { io, server } from "./index";
import { cleanupAllPlaygroundContainers } from "./utils/CleanContainer";

configDotenv();

const PORT = process.env._PORT || 3000;

process.on("SIGINT", async () => {
  console.log("Server shutting down. Cleaning up containers.");
  try {
    await cleanupAllPlaygroundContainers();
    console.log("All containers cleaned up successfully.");
  } catch (error) {
    console.error("Error during container cleanup:", error);
    process.exit(1);
  }
  process.exit(0);
});
process.on("SIGTERM", async () => {
  console.log("Server terminating. Cleaning up containers.");
  try {
    await cleanupAllPlaygroundContainers();
    console.log("All containers cleaned up successfully.");
  } catch (error) {
    console.error("Error during container cleanup:", error);
    process.exit(1);
  }
  process.exit(0);
});

io.on("connection", (socket: Socket) => {
  console.log("Client connected:", socket.id);
  socket.on("send-message", (message) => {
    console.log("Message from client:", message);
    socket.broadcast.emit("receive-message", message);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
