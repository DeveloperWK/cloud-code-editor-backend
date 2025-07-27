import { Request, Response, NextFunction } from "express";

const cookieTest = async (req: Request, res: Response, next: NextFunction) => {
  console.log("cookies: ", req.cookies["refresh_token"]);
  next();
};
export default cookieTest;
