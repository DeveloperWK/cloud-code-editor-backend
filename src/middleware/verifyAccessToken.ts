import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import spbClient from "../config/supabase.config";

const verifyAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const SECRET = process.env._JWT_SECRET!;
  const accessToken = req.access_token || req.cookies.access_token;
  console.log("accessToken from verifyAccessToken", accessToken);
  try {
    const decodedToken = jwt.verify(accessToken, SECRET) as JwtPayload;
    console.log("decodedToken from verifyAccessToken", decodedToken);
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized Token not valid" });
    }
    const { data: user, error: userError } = await spbClient
      .from("users")
      .select("email,name,id")
      .eq("id", decodedToken.userId)
      .single();
    if (userError) {
      return res.status(401).json({ message: "Unauthorized User not found" });
    }
    req.user = user;
    console.log("user from verifyAccessToken", req.user);
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res
      .status(401)
      .json({ message: "Unauthorized Some error occurred", error });
  }
};
export default verifyAccessToken;
