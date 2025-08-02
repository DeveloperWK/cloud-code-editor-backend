import { parentPort, workerData } from "worker_threads";
import { docker } from "../dockerManager";

const stopContainerWorker = async (containerId: string) => {
  const container = docker.getContainer(containerId);
  try {
    const info = await container.inspect();

    if (info.State.Running) {
      console.log(`Stopping container ${containerId}...`);
      console.time(`Stop container ${containerId}`);
      await Promise.race([
        container.stop({ t: 5 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Stop timeout")), 9000),
        ),
      ]);
      console.timeEnd(`Stop container ${containerId}`);
    } else {
      console.log(`Container ${containerId} already stopped.`);
    }
  } catch (e: any) {
    if (e.statusCode === 404) {
      console.log(
        `Container ${containerId} not found, likely already removed.`,
      );
    } else {
      console.error(`Error inspecting/stopping container ${containerId}:`, e);
    }
  }
};

stopContainerWorker(workerData.containerId)
  .then(() => parentPort?.postMessage({ success: true }))
  .catch((error) => {
    parentPort?.postMessage({ error: error.message });
  });
