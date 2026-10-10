import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { authService } from "./regestration.service";

const UserVarify = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyUser(req.body);
  sendSuccess(
    res,
    200,
    "Verification OTP sent to your email. Complete registration with POST /api/v1/auth/register.",
    null,
  );
});

const RegestrationUser = asyncHandler(async (req: Request, res: Response) => {
  const registration = await authService.RegestrtionUser(req.body);
  sendSuccess(
    res,
    200,
    "Email verified. Your student account is waiting for administrator approval.",
    registration,
  );
});

const ResendOtp = asyncHandler(async (req: Request, res: Response) => {
  await authService.resendOtp(req.body.email);
  sendSuccess(res, 200, "A new verification OTP was sent.", null);
});

export const authController = {
  UserVarify,
  RegestrationUser,
  ResendOtp,
};
