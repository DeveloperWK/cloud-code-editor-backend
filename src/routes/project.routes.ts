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
import authorizeProjectAccess from "../middleware/authorizeProjectAccess";

const router = Router();

router.post("/execute-cmd", executeCmd);
router.post("/create-project", createProject);
router.post("/:projectId/open", authorizeProjectAccess, openProject);
router.post("/:projectId/close", authorizeProjectAccess, closeProject);

router.get("/get-project/:projectId", getProject);

router.delete("/:projectId", authorizeProjectAccess, deleteProjectById);

export default router;
