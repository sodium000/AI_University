import { Router } from "express";
import { authController } from "./login.controller";

const router = Router();

router.post("/api/v1/login", authController.loginUser);
router.post("/api/v1/refresh-token", authController.refreshToken);
router.post("/api/v1/logout", authController.logoutUser);

router.post("/api/v1/forgot-password", authController.forgotPassword);
router.post("/api/v1/reset-password", authController.resetPassword);
router.get("/api/v1/me", authController.myInfo);

export const logUser = router;
