import Docker from "dockerode";
import runningPlaygroundContainers from "./runningContainer";
import fse from "fs-extra";

import {
  copySupabaseStorageFolder,
  downloadProjectFiles,
  getProjectHostPath,
  uploadProjectFiles,
} from "./supabaseFileManager";
import {
  getLanguageTemplateById,
  getProjectById,
  updateProjectStatus,
} from "./databaseManager";

const docker = new Docker();

const createContainer = async (
  projectId: string,
  userId: string,
): Promise<string> => {
  const containerName = `playground-${projectId.slice(0, 8)}`;
  const containerPath = "/app/project";
  const hostPath = getProjectHostPath(projectId);

  const project = await getProjectById(projectId);
  console.log("userId", userId);
  if (!project) {
    throw new Error(`Project ${projectId} not found in database.`);
  }
  const image = project.language_template.docker_image;
  console.log("Image", image);
  try {
    await updateProjectStatus(projectId, "loading");
    const existingContainer = docker.getContainer(containerName);
    try {
      const info = await existingContainer.inspect();
      if (info) {
        console.warn(
          `[Docker] Found existing container ${containerName} (ID: ${info.Id}). Forcing removal before creating new one.`,
        );
        if (info.State.Running) {
          await existingContainer.stop();
        }
        await existingContainer.remove();
        console.warn(
          `[Docker] Successfully removed old container ${containerName}.`,
        );
      }
    } catch (e: any) {
      if (e.statusCode === 404) {
        // Container not found, which is ideal!
        console.log(
          `[Docker] No old container ${containerName} found. Proceeding to create new.`,
        );
      } else {
        // Some other error inspecting or removing the old container
        console.error(
          `[Docker] Error checking/removing old container ${containerName}:`,
          e,
        );
        // Decide if you want to throw here or proceed with creation attempts
        // For robustness, it's often better to throw if cleanup fails,
        // as a stale container might interfere.
        throw new Error(
          `Failed to clean up old container for ${projectId}: ${e.message}`,
        );
      }
    }

    if (!project.initialized_with_template) {
      console.log(
        `[Docker] Project ${projectId} not initialized with template. Fetching template...`,
      );

      const template = project.language_template.id;

      if (!template || !project.language_template.default_files_path) {
        console.warn(
          `[Docker] No template or default files path found for template ID: ${project.language_template.id}. Starting with empty project.`,
        );
        await fse.ensureDir(hostPath);
      } else {
        const sourceTemplatePath = project.language_template.default_files_path;
        const destinationProjectPath = `${userId}/${projectId}/`;
        await copySupabaseStorageFolder(
          sourceTemplatePath,
          destinationProjectPath,
        );
        await updateProjectStatus(projectId, "loading", undefined, true);
      }
      await downloadProjectFiles(userId, projectId);
    } else {
      console.log(
        `[Docker] Project ${projectId} already initialized. Downloading latest files.`,
      );
      // If already initialized, just download the latest state from user's storage
      await downloadProjectFiles(userId, projectId);
    }

    if (!image) {
      console.error(`No docker image found for project ${projectId}`);
      return Promise.reject(
        new Error(`No docker image found for project ${projectId}`),
      );
    } else {
      return await tryCreateContainer(
        projectId,
        image,
        containerPath,
        hostPath,
      );
    }
  } catch (err: any) {
    if (err?.json?.message?.includes("No such image")) {
      console.log(`Image ${image} not found locally. Pulling...`);
      await pullImage(image);
      return await tryCreateContainer(
        projectId,
        image,
        containerPath,
        hostPath,
      );
    } else {
      console.error(
        `Failed to create/run container for playground ${projectId}:`,
        err,
      );
      await updateProjectStatus(projectId, "stopped"); // Or 'error'
      throw err;
    }
  }
};

const tryCreateContainer = async (
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
    const createOptions = {
      Image: image,
      name: `playground-${sliceprojectId}`,
      Tty: true,
      OpenStdin: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: containerPath,
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
    return container.id.slice(0, 13);
  }
};

const pullImage = (image: string): Promise<void> => {
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
          // Optionally log progress
          console.log(event);
        }
      },
    );
  });
};

export { createContainer, docker };
