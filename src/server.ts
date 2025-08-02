import { configDotenv } from "dotenv";
import { Socket } from "socket.io";
import { io, performanceMonitor, server } from "./index";
import cluster from "node:cluster";
import os from "node:os";
import { cleanupAllPlaygroundContainers } from "./utils/CleanContainer";

configDotenv();

const PORT = process.env._PORT || 3000;
const startMonitoring = () => {
  setInterval(() => performanceMonitor.memoryUsage(), 30000);
  setInterval(() => performanceMonitor.cpuUsage(), 60000);

  performanceMonitor.on("alert", (alert) => {
    console.warn("🚨 Performance Alert:", alert);
  });

  performanceMonitor.on("metric", (metric) => {
    if (metric.duration > 1000) {
      console.log(
        `⚠️ Slow operation: ${metric.operation} (${metric.duration}ms)`,
      );
    }
  });
};

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

if (cluster.isPrimary) {
  console.log(
    `Master process is running on PID ${process.pid}. Forking workers...`,
  );

  const numCpu = os.cpus().length;
  for (let i = 0; i < numCpu; i++) {
    cluster.fork();
  }
  for (const id in cluster.workers) {
    cluster.workers[id]?.on("message", (msg) => {
      if (msg.type === "metrics") {
        console.log(`📡 Metrics from Worker ${msg.pid}:`, msg.mem, msg.cpu);
      }
    });
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died with code ${code} and signal ${signal}`,
    );
    console.log("Starting a new worker...");
    cluster.fork();
  });

  cluster.on("fork", (worker) => {
    console.log(`Worker ${worker.process.pid} started`);
  });
} else {
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
    if (process.env.NODE_ENV === "production") {
      startMonitoring();
      setInterval(() => {
        const mem = performanceMonitor.memoryUsage();
        const cpu = performanceMonitor.cpuUsage();

        if (process.send) {
          process.send({ type: "metrics", pid: process.pid, mem, cpu });
        }
      }, 60000); // every 60 seconds
    }

    console.log(
      `🚀 Server is running, Worker ${process.pid} is listening on port ${PORT}`,
    );
  });
}
