import Docker from "dockerode";
import runningPlaygroundContainers from "./runningContainer";

const docker = new Docker();

const stopAndRemoveContainer = async (playgroundId: string) => {
  const container = docker.getContainer(`playground-${playgroundId}`);
  try {
    const inspect = await container.inspect();

    if (inspect.State.Running) {
      console.log(`Stopping container: playground-${playgroundId}`);
      await container.stop();
    } else {
      console.log(`Container playground-${playgroundId} already stopped.`);
    }

    console.log(`Removing container: playground-${playgroundId}`);
    await container.remove();
    console.log(`Removed container: playground-${playgroundId}`);
  } catch (err: any) {
    if (err.statusCode === 404) {
      console.warn(`Container playground-${playgroundId} not found.`);
    } else if (err.statusCode === 409) {
      console.warn(
        `Container playground-${playgroundId} is already being removed.`,
      );
    } else {
      console.error(`Error stopping/removing container:`, err);
    }
  }
};

async function cleanupAllPlaygroundContainers() {
  console.log("Initiating cleanup of all playground containers...");

  for (const { containerID, name } of runningPlaygroundContainers) {
    try {
      const container = docker.getContainer(containerID);
      console.log(`Attempting to stop container: ${containerID.slice(0, 13)}`);
      await container.stop();
      console.log(
        `Attempting to remove container: ${containerID.slice(0, 13)}`,
      );
      await container.remove();
      console.log(`Cleaned up container: ${containerID.slice(0, 13)}`);
      runningPlaygroundContainers.delete({ name, containerID });
    } catch (err: any) {
      if (err.statusCode === 404) {
        console.warn(`${containerID} not found, maybe already removed.`);
      } else if (err.statusCode === 409) {
        console.warn(`${containerID} is already being removed.`);
      } else {
        console.error(`Failed to cleanup ${containerID}:`, err);
      }
    }
  }
  console.log("Cleanup process completed.");
  runningPlaygroundContainers.clear();
}
export { cleanupAllPlaygroundContainers, stopAndRemoveContainer };
