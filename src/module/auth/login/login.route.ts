import { Router } from "express";
import { authController } from "./login.controller";

const router = Router();

router.post("/api/v1/login", authController.loginUser);
router.post("/api/v1/refresh-token", authController.refreshToken);
router.post("/api/v1/logout", authController.logoutUser);

export const logUser = router;
