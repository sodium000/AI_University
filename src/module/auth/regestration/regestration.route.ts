import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { authController } from "./resgestration.controller";
import {
  resendOtpSchema,
  registerUserSchema,
  verifyUserSchema,
} from "./regestration.validation";

const router = Router();

router.post(
  "/api/v1/auth/register",
  validate(registerUserSchema),
  authController.RegestrationUser,
);
router.post(
  "/api/v1/auth/verifyUser",
  validate(verifyUserSchema),
  authController.UserVarify,
);
router.post(
  "/api/v1/auth/resendOtp",
  validate(resendOtpSchema),
  authController.ResendOtp,
);

export const authRoutes = router;
