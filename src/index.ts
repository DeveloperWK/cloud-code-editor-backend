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

configDotenv();

const app = express();
const server = createServer(app);
const CLIENT_ORIGIN = process.env._CLIENT_ORIGIN || "http://localhost:3000";

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

app.get("/api/v1/hello-test", async (req: Request, res: Response) => {
  // Use the JS library to create a bucket.

  const { data, error } = await spbClient.storage
    .from("cloud-code-editor")
    .list("node/src");
  console.log(data);
  console.log(error);
  res.send("Hello World!");
});

app.use(notFound);
app.use(errorHandler);

export { io, server };
