interface projects {
  project_id: string;
  user_id: string;
  team_id: string;
  name: string;
  description: string;
  language_template_id: string;
  status: "running" | "stopped" | "removed" | "saving" | "loading";
  container_id: string;
  last_active_at: Date;
  created_at: Date;
  updated_at: Date;
}
interface projectsRow {
  project_id?: string;
  user_id: string;
  team_id: string;
  name: string;
  description: string;
  language_template_id: string;
  created_at: Date;
}
interface refreshToken {
  user_id?: string;
  token: string;
  expires_at: Date;
}
declare global {
  namespace Express {
    interface Request {
      project: projects;
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export { projects, projectsRow, refreshToken };
