import { Request, Response } from "express";
import spbClient from "../../config/supabase.config";
import { projectsRow } from "../../types";
import { createContainer } from "../../utils/dockerManager";
import ptyExecuteCmd from "../../utils/nodePty";
import { getProjectById } from "../../utils/databaseManager";

const executeCmd = (req: Request, res: Response) => {
  const { containerId, command, socketId } = req.body;

  if (!containerId || !command || !socketId) {
    return res
      .status(400)
      .json({ error: "containerId, command and socketId required" });
  }

  ptyExecuteCmd(containerId, command, socketId);
  res.json({ status: "command sent" });
};

const getProject = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json({
      message: "Project found Successfully",
      project,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const createProject = async (req: Request, res: Response) => {
  const { user_id, team_id, name, description, language_template_id } =
    req.body;

  try {
    const { data, error: projectError } = await spbClient
      .from("projects")
      .insert({
        user_id,
        team_id,
        name,
        description,
        language_template: language_template_id,
      })
      .select("project_id") // This tells Supabase to return inserted rows
      .single(); // To get single row object, not array

    const project = data as projectsRow | null;
    console.log(data);
    if (!project) {
      console.error("Supabase insert error:", projectError);
      throw new Error(projectError?.message ?? "Project insert failed");
    }
    if (project) {
      const containerId = await createContainer(project.project_id!, user_id);
      if (!containerId) {
        throw new Error("Container creation failed");
      }
      res.status(200).json({
        message: "Project creation Successful",
        projectId: project.project_id,
        containerId,
      });
    } else {
      throw new Error("Project creation failed");
    }
  } catch (err: any) {
    res.status(417).json({
      error: "Project creation Failed",
      message: err?.message ?? "Unknown error",
      stack: err?.stack,
    });
  }
};

export { createProject, executeCmd, getProject };
