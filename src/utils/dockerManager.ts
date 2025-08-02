import Docker from "dockerode";
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
import tryCreateContainer from "./createContainerManager";
import runWorker from "./workers/createWorkers";
import path from "node:path";
import { configDotenv } from "dotenv";

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

  const image = project.language_template.docker_image.trim();
  try {
    await updateProjectStatus(projectId, "loading");
    const existingContainer = docker.getContainer(containerName);
    try {
      const info = await existingContainer.inspect();
      if (info) {
        console.warn(
          `[Docker] Found existing container ${existingContainer.id} (ID: ${info.Id}). Forcing removal before creating new one.`,
        );
        if (info.State.Running) {
          try {
            await runWorker(
              path.join(
                __dirname,
                "workers",
                `stopContainerWorker${process.env.NODE_ENV === "production" ? ".js" : ".ts"}`,
              ),
              {
                containerId: existingContainer.id,
              },
            );
          } catch (e: any) {
            console.error(`Error stopping container ${containerName}:`, e);
          }
        }
        try {
          await runWorker(
            path.join(
              __dirname,
              "workers",
              `removeContainerWorker${process.env.NODE_ENV === "production" ? ".js" : ".ts"}`,
            ),
            {
              containerId: existingContainer.id,
            },
          );
        } catch (e: any) {
          console.error(`Error removing container ${existingContainer.id}:`, e);
        }
        console.warn(
          `[Docker] Successfully removed old container ${existingContainer.id}.`,
        );
      }
    } catch (e: any) {
      if (e.statusCode === 404) {
        // Container not found, which is ideal!
        console.log(
          `[Docker] No old container ${existingContainer.id} found. Proceeding to create new.`,
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

const pullImage = async (image: string): Promise<void> => {
  try {
    await runWorker(
      path.join(
        __dirname,
        "workers",
        `pullImageWorker${process.env.NODE_ENV === "production" ? ".js" : ".ts"}`,
      ),
      {
        image,
      },
    );
  } catch (error) {
    console.error("Error in container worker:", (error as Error).message);
    throw error;
  }
};

export { createContainer, docker };
