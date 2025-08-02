import spbClient from "../config/supabase.config";
import type { languageTemplate, projects } from "../types";

const getProjectById = async (projectId: string): Promise<projects | null> => {
  try {
    const { data: projectDetails, error: projectError } = await spbClient
      .from("projects")
      .select(`* , language_template(*)`)
      .eq("project_id", projectId)
      .single();
    if (projectError) {
      if (projectError.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching project details :", projectError);
      throw new Error(`Project with id ${projectId} not found`);
    }
    console.log(`projectDetails :${JSON.stringify(projectDetails)}`);
    console.log(
      `[Docker] Simulating fetching project ${projectDetails?.name} from DB.`,
    );

    return projectDetails;
  } catch (error) {
    console.error("Error fetching project details :", error);
    throw new Error(`Project with id ${projectId} not found`);
  }
};

const getLanguageTemplateById = async (
  templateId: string,
): Promise<languageTemplate | null> => {
  const { data, error } = await spbClient
    .from("language_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error(`DB: Error fetching language template ${templateId}:`, error);
    throw error;
  }
  return data as languageTemplate | null;
};

async function updateProjectStatus(
  id: string,
  status: projects["status"],
  containerId: string | null = null,
  initializedWithTemplate: boolean | undefined = undefined, // New parameter
): Promise<void> {
  console.log(
    `[Docker] Simulating updating Project ${id} status to ${status}, containerId: ${containerId}`,
  );
  const updateData: Partial<projects> = { status };
  if (containerId !== undefined) {
    updateData.container_id = containerId?.slice(0, 13);
  }
  if (initializedWithTemplate !== undefined) {
    updateData.initialized_with_template = initializedWithTemplate;
  }
  if (["active", "running", "loading", "saving"].includes(status)) {
    updateData.last_active_at = new Date().toISOString();
  }
  const { error } = await spbClient
    .from("projects")
    .update(updateData)
    .eq("project_id", id);
  if (error) {
    console.error("Error updating project status :", error);
    throw new Error(`Failed to update project status`);
  }
}
export { getProjectById, updateProjectStatus, getLanguageTemplateById };
