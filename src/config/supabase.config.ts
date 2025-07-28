import { createClient } from "@supabase/supabase-js";
import { configDotenv } from "dotenv";
configDotenv();
const SUPABASE_URL = (process.env._SUPABASE_URL as string) || "";
const SUPABASE_SERVICE_ROLE_KEY =
  (process.env._SUPABASE_SERVICE_ROLE_KEY! as string) || "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY!) {
  throw new Error("Supabase URL and Service Key must be provided.");
}
const spbClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false,
  },
});
export default spbClient;
