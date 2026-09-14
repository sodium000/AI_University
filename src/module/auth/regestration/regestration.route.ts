import { Router } from "express";
import { authController } from "./resgestration.controller";

const router = Router();

router.post("/api/v1/auth/register", authController.RegestrationUser);
router.post("/api/v1/auth/verifyUser", authController.UserVarify);

export const authRoutes = router;
