import e from "express";
import spbClient from "../config/supabase.config";
import { getProjectById, updateProjectStatus } from "./databaseManager";
import { docker } from "./dockerManager";
import listAllFilesRecursive from "./listAllFilesRecursive";
import { getProjectHostPath, uploadProjectFiles } from "./supabaseFileManager";
import * as fse from "fs-extra";
const BUCKET_NAME = "cloud-code-editor";
const stopAndSaveProjectContainer = async (
  projectId: string,
  userId: string,
): Promise<void> => {
  try {
    await updateProjectStatus(projectId, "saving");
    const project = await getProjectById(projectId);
    if (!project || !project.container_id) {
      console.warn(
        `Project ${projectId} not found or no active container to stop/save.`,
      );
      await updateProjectStatus(projectId, "stopped", null);
      return;
    }
    const container = docker.getContainer(project.container_id);
    try {
      const info = await container.inspect();
      if (info.State.Running) {
        console.log(`Stopping container ${project.container_id}...`);
        await container.stop();
      }
    } catch (e: any) {
      if (e.statusCode === 404) {
        console.log(
          `Container ${project.container_id} not found, already removed.`,
        );
      } else {
        console.error(
          `Error inspecting/stopping container ${project.container_id}:`,
          e,
        );
        // Decide if you want to proceed with file upload despite stop error
      }
    }
    await uploadProjectFiles(userId, projectId);
    try {
      console.log(`Removing container ${project.container_id}...`);
      await container.remove();
    } catch (e: any) {
      if (e.statusCode === 404) {
        console.log(`Container ${project.container_id} already removed.`);
      } else {
        console.error(`Error removing container ${project.container_id}:`, e);
      }
    }
    const hostPath = getProjectHostPath(projectId);
    if (await fse.pathExists(hostPath)) {
      console.log(`Cleaning up host directory ${hostPath}.`);
      await fse.rm(hostPath, { recursive: true, force: true });
    }
    await updateProjectStatus(projectId, "stopped", null);
    console.log(`Project ${projectId} stopped and files saved.`);
  } catch (error) {
    console.error(
      `Failed to stop/save container for Project${projectId}:`,
      error,
    );
    await updateProjectStatus(projectId, "stopped", null); // Ensure status reflects reality
    throw error;
  }
};
async function deleteProject(projectId: string, userId: string): Promise<void> {
  try {
    const project = await getProjectById(projectId);
    if (project && project.container_id) {
      const container = docker.getContainer(project.container_id);
      try {
        await container.stop();
        await container.remove();
        console.log(
          `[Docker] Container ${project.container_id} removed for deletion.`,
        );
      } catch (e: any) {
        if (e.statusCode === 404) {
          console.warn(
            `[Docker] Container ${project.container_id} not found during delete, likely already removed.`,
          );
        } else {
          console.error(
            `[Docker] Error stopping/removing container for delete ${projectId}:`,
            e,
          );
        }
      }
    }

    // Delete files from Supabase Storage
    const allFilePaths = await listAllFilesRecursive(`${userId}/${projectId}`);
    if (allFilePaths.length > 0) {
      const { error } = await spbClient.storage
        .from(BUCKET_NAME)
        .remove(allFilePaths);
      if (error) {
        console.error(
          `[Supabase] Error deleting files from Supabase Storage:`,
          error,
        );
      } else {
        console.log(
          `[Supabase] Files deleted from Supabase Storage for ${projectId}.`,
        );
      }
    } else {
      console.log(`[Supabase] No files found in ${userId}/${projectId}`);
    }

    // Clean up host directory
    const hostPath = getProjectHostPath(projectId);
    if (await fse.pathExists(hostPath)) {
      await fse.remove(hostPath);
      console.log(`[FS] Cleaned up host directory ${hostPath}.`);
    }

    // Delete project record from your database
    const { error: dbError } = await spbClient
      .from("projects")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (dbError) {
      console.error(
        `[DB] Error deleting project ${projectId} from database:`,
        dbError,
      );
      throw dbError;
    }
    console.log(`[DB] Project ${projectId} record deleted.`);

    console.log(
      `[Lifecycle] Project ${projectId} and all its data fully deleted.`,
    );
  } catch (error) {
    console.error(`[Lifecycle] Failed to delete project ${projectId}:`, error);
    throw error;
  }
}

export { stopAndSaveProjectContainer, deleteProject };
