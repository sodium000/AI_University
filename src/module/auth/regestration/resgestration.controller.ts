import { Request, Response } from "express";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { authService } from "./regestration.service";

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

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
  const { accessToken, refreshToken } = await authService.RegestrtionUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, 200, "User registration completed successfully", {
    accessToken,
    refreshToken,
  });
});

export const authController = {
  UserVarify,
  RegestrationUser,
};
