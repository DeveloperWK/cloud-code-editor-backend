import { Router } from "express";
import {
  createProject,
  executeCmd,
  getProject,
} from "../controllers/projects/projects.controller";
import {
  closeProject,
  deleteProjectById,
  openProject,
} from "../controllers/projects/projectLifecycle.controller";

const router = Router();

router.post("/execute-cmd", executeCmd);
router.post("/create-project", createProject);
router.post("/:projectId/open", openProject);
router.post("/:projectId/close", closeProject);
router.get("/get-project/:projectId", getProject);
router.delete("/:projectId", deleteProjectById);

export default router;
