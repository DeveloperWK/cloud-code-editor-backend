import spbClient from "../config/supabase.config";
async function storeRefreshToken(userId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 15);
  await spbClient.from("refresh_tokens").upsert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  });
}

async function updateRefreshToken(userId: string, token: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 15);
  await spbClient
    .from("refresh_tokens")
    .update({
      token,
      expires_at: expiresAt.toISOString(),
    })
    .eq("user_id", userId);
  console.log("Token updated successfully");
}

export { storeRefreshToken, updateRefreshToken };
