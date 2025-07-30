function joinSupabasePath(...parts: string[]): string {
  return parts
    .filter(Boolean) // remove empty strings
    .map((part) => part.replace(/^\/+|\/+$/g, "")) // trim leading/trailing slashes
    .join("/");
}
export default joinSupabasePath;
