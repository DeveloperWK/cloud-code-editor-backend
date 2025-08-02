import { parentPort, workerData } from "worker_threads";
import { updateProjectStatus } from "../databaseManager";
import runningPlaygroundContainers from "../runningContainer";
import { docker } from "../dockerManager";

const tryCreateContainerWorker = async (
  projectId: string,
  image: string,
  containerPath: string,
  hostPath: string,
) => {
  const sliceprojectId = projectId.slice(0, 8);
  let container = docker.getContainer(`playground-${sliceprojectId}`);
  let containerExists = false;
  try {
    await container.inspect();
    containerExists = true;
  } catch (error: any) {
    if (error.statusCode === 404) {
      containerExists = false;
    } else {
      console.error(error);
    }
  }
  if (containerExists) {
    console.log(
      `Container playground-${projectId} already exists. Attempting to start.`,
    );
    const info = await container.inspect();
    if (info.State.Running) {
      console.log(`Container playground-${projectId} is already running.`);
      await updateProjectStatus(projectId, "running", container.id);
      return container.id;
    } else {
      await container.start();
      console.log(`Started existing container playground-${projectId}.`);
      await updateProjectStatus(projectId, "running", container.id);
      return container.id;
    }
  } else {
    const uid = typeof process.getuid === "function" ? process.getuid() : 1000;
    const gid = typeof process.getgid === "function" ? process.getgid() : 1000;
    const createOptions = {
      Image: image,
      name: `playground-${sliceprojectId}`,
      Tty: true,
      OpenStdin: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: containerPath,
      User: `${uid}:${gid}`,
      HostConfig: {
        Binds: [`${hostPath}:${containerPath}`],
        Memory: 512 * 1024 * 1024, // 512 MB
        CpuPeriod: 100000,
        CpuQuota: 25000, // 25% CPU
      },
      Cmd: ["tail", "-f", "/dev/null"], // Keep container running
    };
    container = await docker.createContainer(createOptions);
    await container.start();
    console.log(
      `Created and started container for playground ${projectId}: ${container.id}`,
    );
    await updateProjectStatus(projectId, "running", container.id);
    runningPlaygroundContainers.add({
      name: projectId,
      containerID: container.id.slice(0, 13),
    });
    return { containerId: container.id.slice(0, 13) };
  }
};
tryCreateContainerWorker(
  workerData.projectId,
  workerData.image,
  workerData.containerPath,
  workerData.hostPath,
)
  .then((result) => parentPort?.postMessage(result))
  .catch((error) => parentPort?.postMessage({ error: error.message }));
