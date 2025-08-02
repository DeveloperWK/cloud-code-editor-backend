import { parentPort, workerData } from "worker_threads";
import { docker } from "../dockerManager";

const pullImageWorker = async (image: string) => {
  return new Promise<void>((resolve, reject) => {
    docker.pull(
      image,
      (err: NodeJS.ErrnoException | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, onFinished, onProgress);
        function onFinished(err: any) {
          if (err) return reject(err);
          console.log(`Successfully pulled image: ${image}`);
          resolve();
        }
        function onProgress(event: any) {
          console.log(event);
        }
      },
    );
  });
};

pullImageWorker(workerData.image)
  .then(() => {
    parentPort?.postMessage({ status: "success" });
  })
  .catch((error) => {
    parentPort?.postMessage({ status: "error", error });
  });
