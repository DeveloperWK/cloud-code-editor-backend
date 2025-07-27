import { Router } from "express";
import {
  deleteRefreshToken,
  login,
  signup,
} from "../controllers/auth/auth.controller";
import {
  googleOAuthCallback,
  startGoogleOAuth,
} from "../controllers/auth/oauth.controller";
const router = Router();

router.post("/signup", signup);
router.post("/login", login);

// router.get("/login/refresh-token", sendRefreshToken);
// router.get("/login/access-token", sendAccessToken);

router.get("/oauth/google", startGoogleOAuth);
router.get("/oauth/google/callback", googleOAuthCallback);

router.delete("/delete-refresh-token", deleteRefreshToken);

export default router;
