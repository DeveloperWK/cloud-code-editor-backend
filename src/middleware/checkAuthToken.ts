import { NextFunction, Request, Response } from "express";
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../service/refreshToken.service";
import verifyUserById from "../utils/verifyUserById";
import generateAccessToken from "../service/jwt.service";
import {
  sendUpdatedAccessToken,
  sendUpdatedRefreshToken,
  setCookies,
} from "../utils/issueTokensAndSetCookies";
import { updateRefreshToken } from "../service/token.service";

const checkAuthToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const accessToken = req.cookies.access_token;
  const refreshToken = req.cookies.refresh_token;
  const userId = req.cookies.user_id;
  const isUserExists = await verifyUserById(userId);
  try {
    const isVerifiedRefreshToken = await verifyRefreshToken(refreshToken);
    if (isVerifiedRefreshToken && !accessToken && isUserExists) {
      const newAccessToken = generateAccessToken({ userId });
      console.log("New Token Generate", newAccessToken);
      await sendUpdatedAccessToken(res, newAccessToken);
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message === "Token expired") {
      const newRefreshToken = generateRefreshToken();
      await updateRefreshToken(userId, hashRefreshToken(newRefreshToken));
      if (!accessToken && userId) {
        const newAccessToken = generateAccessToken({ userId });
        console.log("New Token Generate on catch", newAccessToken);
        await setCookies(res, newAccessToken, newRefreshToken);
      } else {
        await sendUpdatedRefreshToken(res, newRefreshToken);
      }
    }
  } finally {
    next();
  }
};
export default checkAuthToken;
