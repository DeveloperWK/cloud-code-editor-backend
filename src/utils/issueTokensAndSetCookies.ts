import { serialize } from "cookie";
import { Response } from "express";

import generateAccessToken from "../service/jwt.service";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../service/refreshToken.service";
import { storeRefreshToken } from "../service/token.service";

async function issueTokensAndSetCookies(userId: string, res: Response) {
  const accessToken = generateAccessToken({ userId });
  const refreshToken = generateRefreshToken();
  await storeRefreshToken(userId, hashRefreshToken(refreshToken));
  await setCookies(res, accessToken, refreshToken, userId);
}
const setCookies = async (
  res: Response,
  accessToken: string,
  refreshToken: string,
  userId?: string,
) => {
  const cookieOptions = [
    serialize("access_token", accessToken, {
      //   httpOnly: true,
      maxAge: 60 * 15, // 15 minutes
      path: "/",
      sameSite: "lax",
      //   secure: process.env.NODE_ENV === "production",
    }),
    serialize("refresh_token", refreshToken, {
      //   httpOnly: true,
      path: "/",
      sameSite: "lax",
      //   secure: process.env.NODE_ENV === "production",
    }),
  ];
  if (userId) {
    cookieOptions.push(
      serialize("user_id", userId, {
        //   httpOnly: true,
        path: "/",
        sameSite: "lax",
        //   secure: process.env.NODE_ENV === "production",
      }),
    );
  }
  res.setHeader("Set-Cookie", cookieOptions);
};
const sendUpdatedAccessToken = async (res: Response, accessToken: string) => {
  res.setHeader("Set-Cookie", [
    serialize("access_token", accessToken, {
      //   httpOnly: true,
      maxAge: 60 * 15, // 15 minutes
      path: "/",
      sameSite: "lax",
      //   secure: process.env.NODE_ENV === "production",
    }),
  ]);
};
const sendUpdatedRefreshToken = async (res: Response, refreshToken: string) => {
  res.setHeader("Set-Cookie", [
    serialize("refresh_token", refreshToken, {
      //   httpOnly: true,
      path: "/",
      sameSite: "lax",
      //   secure: process.env.NODE_ENV === "production",
    }),
  ]);
};

export {
  issueTokensAndSetCookies,
  sendUpdatedAccessToken,
  sendUpdatedRefreshToken,
  setCookies,
};
