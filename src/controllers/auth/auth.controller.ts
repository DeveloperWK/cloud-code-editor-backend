import { Request, Response } from "express";
import spbClient from "../../config/supabase.config";
import generateAccessToken from "../../service/jwt.service";
import { hashPassword, verifyPassword } from "../../service/password.service";
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../../service/refreshToken.service";
import { updateRefreshToken } from "../../service/token.service";
import {
  issueTokensAndSetCookies,
  sendUpdatedAccessToken,
  setCookies,
} from "../../utils/issueTokensAndSetCookies";
const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).send("Email & password required");
    }
    const { data: existingUser } = await spbClient
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) return res.status(409).send("User already exists");
    const hashedPassword = await hashPassword(password);
    const { data: newUser, error } = await spbClient
      .from("users")
      .insert([{ email, password: hashedPassword, name }])
      .select("id")
      .single();
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).send("Failed to signup user");
    }

    await issueTokensAndSetCookies(newUser.id, res);
    res.status(201).json({
      message: "Signup successful",
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Failed to signup user" });
  }
};
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const { data: user } = await spbClient
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user || !user.password)
      return res.status(401).json({ message: "Invalid credentials" });

    const passwordMatch = await verifyPassword(password, user.password);
    if (!passwordMatch) return res.status(401).send("Invalid credentials");

    await issueTokensAndSetCookies(user.id, res);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login user" });
  }
};

const deleteRefreshToken = async (req: Request, res: Response) => {
  const { user_id } = req.body;
  try {
    if (!user_id) return res.status(400).json({ message: "User ID required" });

    const { error } = await spbClient
      .from("refresh_tokens")
      .delete()
      .eq("user_id", user_id);
    if (!error?.hint) {
      res.status(500).json({
        message: "Failed to Delete Refresh Token",
        error: error?.message,
      });
    }
    res.status(200).json({
      message: "Refresh Token delete successful",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Failed to Delete Refresh Token" });
  }
};

const sendRefreshToken = async (req: Request, res: Response) => {
  const { user_id } = req.body;
  try {
    const accessToken = generateAccessToken({ user_id });
    const refreshToken = generateRefreshToken();
    await updateRefreshToken(user_id, hashRefreshToken(refreshToken));
    await setCookies(res, accessToken, refreshToken);
    res.status(200).json({
      message: "Refresh Token Updated",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
};
const sendAccessToken = async (req: Request, res: Response) => {
  const { refresh_token, user_id } = req.body;
  try {
    if (!refresh_token || !user_id) {
      res.status(404).json({
        message: "refresh_token and user_id required",
      });
    }
    const compare = await verifyRefreshToken(refresh_token);
    if (compare) {
      const accessToken = generateAccessToken({ user_id });
      await sendUpdatedAccessToken(res, accessToken);
      res.status(200).json({
        message: "AccessToken Updated",
      });
    } else {
      res.status(403).json({
        message: "Refresh Token mismatch Forbidden Access",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error,
    });
  }
};
export { deleteRefreshToken, login, sendAccessToken, sendRefreshToken, signup };
