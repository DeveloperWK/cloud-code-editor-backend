import { Worker } from "node:worker_threads";
import type { runWorkerOptions } from "../../types";
import path from "node:path";
import { configDotenv } from "dotenv";

async function runWorker<Result = any, Data = any>(
  workerPath: string,
  data?: Data,
  options: runWorkerOptions = {},
): Promise<Result> {
  const { timeout, workerOptions } = options;
  return new Promise((resolve, reject) => {
    let worker;
    console.log("workers env", process.env.NODE_ENV);
    if (process.env.NODE_ENV !== "production") {
      const loaderPath = path.resolve(__dirname, "tsWorkerLoader.js");
      const tsFilePath = path.resolve(workerPath);
      worker = new Worker(loaderPath, {
        workerData: data,
        argv: [tsFilePath],
        ...workerOptions,
      });
    } else {
      worker = new Worker(workerPath, {
        workerData: data,
        ...workerOptions,
      });
    }
    let timeoutId: NodeJS.Timeout | undefined;
    if (timeout) {
      timeoutId = setTimeout(() => {
        terminateWorker(new Error(`Worker timed out after ${timeout}ms`));
      }, timeout);
    }
    const terminateWorker = (err?: Error) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      worker.removeAllListeners();
      worker.terminate().catch((terminateError) => {
        console.error("Failed to terminate worker:", terminateError);
      });
      if (err) {
        reject(err);
      }
    };
    worker.on("message", (message) => {
      terminateWorker();
      resolve(message);
    });
    worker.on("error", (error) => {
      terminateWorker(error);
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        terminateWorker(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    worker.on("messageerror", (error) => {
      terminateWorker(new Error(`Worker message error: ${error.message}`));
    });
  });
}
export default runWorker;
