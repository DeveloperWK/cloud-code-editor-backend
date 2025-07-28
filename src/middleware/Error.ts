import { NextFunction, Request, Response } from "express";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Internal Server Error",
    error: err.message,
    stack:
      process.env.NODE_ENV === "production"
        ? "No stack trace available"
        : err.stack,
    timestamp: new Date().toISOString(),
  });
};
export default errorHandler;
