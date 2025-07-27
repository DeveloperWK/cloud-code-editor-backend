import spbClient from "../config/supabase.config";

const verifyUserById = async (userId: string) => {
  const { data, error } = await spbClient
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  return !!data;
};
export default verifyUserById;
