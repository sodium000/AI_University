import { Request, Response } from "express";
import { AppError } from "../../../errors/AppError";
import { ErrorCode } from "../../../errors/errorCodes";
import { asyncHandler } from "../../../utils/asyncHandler";
import { sendSuccess } from "../../../utils/apiResponse";
import { authService } from "./login.service";
import { authReset } from "./passwordReSet.service";

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
  secureCookies = false,
) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, refreshToken } = await authService.loginUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  sendSuccess(res, 200, "User logged in successfully", {
    accessToken,
    refreshToken,
  });
});

const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies.refreshToken;

  if (!oldRefreshToken) {
    throw AppError.unauthorized(
      "Refresh token is missing from cookies.",
      ErrorCode.AUTH_TOKEN_MISSING,
      {
        hint: "Login again or send the refreshToken cookie set during login.",
      },
    );
  }

  const { accessToken, newRefreshToken } =
    await authService.refreshToken(oldRefreshToken);

  const secureCookies = process.env.NODE_ENV === "production";
  setAuthCookies(res, accessToken, newRefreshToken, secureCookies);

  sendSuccess(res, 200, "Access token refreshed successfully", {
    accessToken,
    refreshToken: newRefreshToken,
  });
});

const logoutUser = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: false,
    sameSite: "none",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false,
    sameSite: "none",
  });

  sendSuccess(res, 200, "User logged out successfully", null);
});

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authReset.forgotPassword(req.body);
  sendSuccess(
    res,
    200,
    `Password reset OTP sent to ${req.body.email}`,
    null,
  );
});

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authReset.resetPassword(req.body);
  sendSuccess(res, 200, "Password changed successfully", null);
});

const myInfo = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.myInfo(req.params.id as string);
  sendSuccess(res, 200, "User info fetched successfully", user);
});

export const authController = {
  loginUser,
  logoutUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  myInfo,
};
