import { getProjectHostPath } from "./supabaseFileManager";
import path from "node:path";
const getAbsolutePath = (projectId: string, getPath?: string | undefined) => {
  const hostPath = getProjectHostPath(projectId);
  const cleanedPath = path.join(
    hostPath,
    getPath && getPath.trim() !== "" ? getPath : "",
  );
  return cleanedPath;
};
export default getAbsolutePath;
