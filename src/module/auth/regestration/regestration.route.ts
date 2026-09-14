import { Router } from "express";
import { authController } from "./resgestration.controller";

const router = Router();

router.post("/api/v1/auth/register", authController.Registration);

export const authRoutes = router;
