import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "node:http";
import { Server as IOServer } from "socket.io";
import AuthRoutes from "./routes/auth.routes";
import PlaygroundRoutes from "./routes/project.routes";
import { configDotenv } from "dotenv";
const app = express();
const server = createServer(app);
const CLIENT_ORIGIN = "http://localhost:3000";
const io = new IOServer(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
});

configDotenv();

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

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/projects", PlaygroundRoutes);

app.get("/hello-test", (req: Request, res: Response) => {
  res.send("Hello Bangladesh");
});

export { io, server };
