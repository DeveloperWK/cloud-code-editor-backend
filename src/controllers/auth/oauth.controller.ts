import axios from "axios";
import { configDotenv } from "dotenv";
import { Request, Response } from "express";
import spbClient from "../../config/supabase.config";
import { issueTokensAndSetCookies } from "../../utils/issueTokensAndSetCookies";

const GOOGLE_CLIENT_ID = process.env._GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env._GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = `${process.env._SERVER_URI as string}api/v1/auth/oauth/google/callback`;

async function startGoogleOAuth(req: Request, res: Response) {
  const { action } = req.query;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state: action as string,
  });
  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
async function googleOAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query; // state carries 'signup' or 'login'

  if (!code) {
    return res.status(400).send("Missing OAuth code");
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      null,
      {
        params: {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: GOOGLE_REDIRECT_URI,
        },
      },
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res
        .status(400)
        .send("Failed to retrieve access token from Google");
    }

    // 2. Fetch user profile from Google
    const userInfoRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const googleUser = userInfoRes.data;

    if (!googleUser?.id) {
      return res.status(400).send("Failed to fetch user profile from Google");
    }

    // 3. Check if user exists in Supabase
    const { data: existingUser } = await spbClient
      .from("users")
      .select("*")
      .eq("provider_id", googleUser.id)
      .eq("oauth_provider", "google")
      .single();

    // 4. Handle signup or login
    if (state === "signup") {
      if (existingUser) {
        return res.status(409).send("User already signed up");
      }

      // Signup process
      const { data: newUser, error } = await spbClient
        .from("users")
        .insert([
          {
            oauth_provider: "google",
            provider_id: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            avatar_url: googleUser.picture,
            verified: true,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).send("Failed to signup user");
      }

      if (!newUser) {
        return res.status(500).send("Failed to signup user");
      }

      await issueTokensAndSetCookies(newUser.id, res);
    } else {
      if (!existingUser) {
        return res.status(404).send("User not found, please signup first");
      }

      await issueTokensAndSetCookies(existingUser.id, res);
    }

    // 5. Redirect to dashboard after auth
    res.redirect("http://localhost:3000/dashboard");
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return res.status(500).send("OAuth process failed");
  }
}
export { googleOAuthCallback, startGoogleOAuth };
