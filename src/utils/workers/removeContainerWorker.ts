import { parentPort, workerData } from "worker_threads";
import { docker } from "../dockerManager";

const removeContainerWorker = async (containerId: string) => {
  const container = docker.getContainer(containerId);
  try {
    await container.remove();
    console.log(`Container ${containerId} removed.`);
  } catch (e: any) {
    if (e.statusCode === 404) {
      console.log(`Container ${containerId} not found, already removed.`);
    } else {
      console.error(`Error removing container ${containerId}:`, e);
      // Decide if you want to proceed with file upload despite remove error
    }
  }
};
removeContainerWorker(workerData.containerId)
  .then(() => parentPort?.postMessage({ success: true }))
  .catch((error) => {
    parentPort?.postMessage({ error: error.message });
  });
