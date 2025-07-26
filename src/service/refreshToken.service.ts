import crypto from "node:crypto";
import spbClient from "../config/supabase.config";
import { refreshToken } from "../types";

const generateRefreshToken = (): string => {
  const token = crypto.randomBytes(64).toString("hex");
  return token;
};

const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
const safeCompare = (userSendToken: string, tokenFromDB: string): boolean => {
  const userSendTokenBuffer = Buffer.from(userSendToken);
  const tokenFromDBBuffer = Buffer.from(tokenFromDB);
  if (userSendTokenBuffer.length !== tokenFromDBBuffer.length) return false;
  return crypto.timingSafeEqual(userSendTokenBuffer, tokenFromDBBuffer);
};
const verifyRefreshToken = async (
  receivedToken: string,
): Promise<boolean | null> => {
  const hashed = hashRefreshToken(receivedToken);
  console.log("hashedToken", hashed);
  const { data, error: refreshTokenError } = await spbClient
    .from("refresh_tokens")
    .select("token, expires_at")
    .eq("token", hashed)
    .single();
  const refreshToken = data as refreshToken | null;
  if (refreshTokenError) {
    console.error("Database error verifying refresh token:", refreshTokenError);
    // Depending on your application's error handling strategy, you might
    // throw a more specific error or return false.
    throw new Error(
      `Failed to verify token due to a database error. ${refreshTokenError}`,
    );
  }
  if (!safeCompare(hashed, refreshToken?.token!)) {
    console.error("Token mismatch");
    return null;
  }
  if (!refreshToken) {
    return null; // Token not found (or not matching the hashed version)
  }
  const expiryDate = new Date(refreshToken.expires_at);
  if (new Date() > expiryDate) {
    throw new Error("Token expired");
  }
  return true;
};

export { generateRefreshToken, hashRefreshToken, verifyRefreshToken };
