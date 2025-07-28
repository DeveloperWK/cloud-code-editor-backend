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

app.get("/api/v1/hello-test", checkAuthToken, (req: Request, res: Response) => {
  res.send("Hello Bangladesh");
});

app.use(notFound);
app.use(errorHandler);

export { io, server };
