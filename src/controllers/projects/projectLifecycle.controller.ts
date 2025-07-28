import { Response, Request } from "express";
import { createContainer } from "../../utils/dockerManager";
import {
  deleteProject,
  stopAndSaveProjectContainer,
} from "../../utils/projectsManager";
const openProject = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.project.project_id;
  const userId = req.user?.id;
  try {
    const containerId = await createContainer(projectId, userId!);
    res.status(200).json({
      message: `Project ${projectId} opened successfully.`,
      projectId,
      containerId,
    });
  } catch (error) {
    console.error(`API: Failed to open project ${projectId}:`, error);
    res.status(500).json({
      message: "Failed to open project",
      error: (error as Error).message,
    });
  }
};
const closeProject = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.project.project_id;
  const userId = req.user?.id;
  try {
    await stopAndSaveProjectContainer(projectId, userId!);
    res
      .status(200)
      .json({ message: `Project ${projectId} closed and saved successfully.` });
  } catch (error) {
    console.error(`API: Failed to close project ${projectId}:`, error);
    res.status(500).json({
      message: "Failed to close project",
      error: (error as Error).message,
    });
  }
};
const deleteProjectById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const projectId = req.project.project_id;
  const userId = req.user?.id;
  try {
    await deleteProject(projectId, userId!);
    res
      .status(200)
      .json({ message: `Project ${projectId} deleted successfully.` });
  } catch (error) {
    console.error(`API: Failed to delete project ${projectId}:`, error);
    res.status(500).json({
      message: "Failed to delete project",
      error: (error as Error).message,
    });
  }
};
export { openProject, closeProject, deleteProjectById };
