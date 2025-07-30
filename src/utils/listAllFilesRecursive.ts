import spbClient from "../config/supabase.config";
import path from "node:path";
const BUCKET_NAME = "cloud-code-editor";

const listAllFilesRecursive = async (
  currentPath: string,
  accumulated: string[] = [],
  visitedPaths: Set<string> = new Set(),
): Promise<string[]> => {
  if (visitedPaths.has(currentPath)) {
    return accumulated;
  }
  visitedPaths.add(currentPath);

  const { data: items, error } = await spbClient.storage
    .from(BUCKET_NAME)
    .list(currentPath, { limit: 1000 });

  if (error) throw error;

  await Promise.all(
    (items || []).map(async (item) => {
      const itemPath = path.posix.join(currentPath, item.name);
      if (item.metadata?.mimetype) {
        accumulated.push(itemPath); // File
      } else {
        await listAllFilesRecursive(itemPath, accumulated, visitedPaths); // Folder
      }
    }),
  );

  return accumulated;
};
export default listAllFilesRecursive;
