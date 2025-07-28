import { Request, Response, NextFunction } from "express";
import { getProjectById } from "../utils/databaseManager";

const authorizeProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { projectId } = req.params;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (project.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not own this project." });
    }
    req.project = project;
    next();
  } catch (error) {
    console.error(`Authorization error for project ${projectId}:`, error);
    res.status(500).json({
      message: "Authorization failed",
      error: (error as Error).message,
    });
  }
};
export default authorizeProjectAccess;
