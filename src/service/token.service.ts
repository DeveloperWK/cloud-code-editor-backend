import spbClient from "../config/supabase.config";
async function storeRefreshToken(userId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await spbClient.from("refresh_tokens").insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });
}
async function updateRefreshToken(userId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await spbClient
    .from("refresh_tokens")
    .update({
      token,
      expires_at: expiresAt.toISOString(),
    })
    .eq("user_id", userId);
}

export { storeRefreshToken, updateRefreshToken };
