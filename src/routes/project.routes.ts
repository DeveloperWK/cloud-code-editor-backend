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
router.post("/open/:projectId", authorizeProjectAccess, openProject);
router.post("/close/:projectId", authorizeProjectAccess, closeProject);

router.get("/get-project/:projectId", getProject);

router.delete("/:projectId", authorizeProjectAccess, deleteProjectById);

export default router;
