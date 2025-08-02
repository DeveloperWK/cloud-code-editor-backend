import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "node:http";
import { Server as IOServer } from "socket.io";
import AuthRoutes from "./routes/auth.routes";
import ProjectsRoutes from "./routes/project.routes";
import { configDotenv } from "dotenv";
import cookieParser from "cookie-parser";
import checkAuthToken from "./middleware/checkAuthToken";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/Error";
import verifyAccessToken from "./middleware/verifyAccessToken";
import spbClient from "./config/supabase.config";
import PerformanceMonitor from "./monitor/performance-monitor";
import PerformanceMiddleware from "./middleware/performance.middleware";

configDotenv();

const app = express();
const server = createServer(app);
const CLIENT_ORIGIN = process.env._CLIENT_ORIGIN || "http://localhost:3000";
const performanceMonitor = new PerformanceMonitor({
  enableLogging: true,
  logToFile: true,
  logFilePath: "./logs/performance.log",
  alertThresholds: {
    responseTime: 500,
    memoryUsage: 85,
    errorRate: 3,
  },
});
const performanceMonitorMiddleware = new PerformanceMiddleware(
  performanceMonitor,
);
const io = new IOServer(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 5000,
  maxHttpBufferSize: 1e6,
  transports: ["websocket"],
  allowEIO3: false,
  path: "/socket.io",
});

app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/projects", checkAuthToken, verifyAccessToken, ProjectsRoutes);
app.get("/health", performanceMonitorMiddleware.healthHandler());
app.get("/performance", performanceMonitorMiddleware.performanceHandler());

app.use(notFound);
app.use(errorHandler);

export { io, server, performanceMonitor };
