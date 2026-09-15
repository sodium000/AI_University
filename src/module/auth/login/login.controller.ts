import { NextFunction, Request, Response } from "express";
import { authService } from "./login.service";
import { authReset } from "./passwordReSet.service";

const loginUser = async (req: Request, res: Response) => {
  const payload = req.body;

  try {
    const { accessToken, refreshToken } = await authService.loginUser(payload);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 day
    });

    res.send({
      success: true,
      statusCode: 200,
      message: "User logged in successfully",
      data: { accessToken, refreshToken },
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const refreshToken = async (req: Request, res: Response) => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        message: "Aunthorized user",
      });
    }

    const { accessToken, newRefreshToken } =
      await authService.refreshToken(oldRefreshToken);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return res.status(200).send({
      success: true,
      statusCode: 200,
      message: "Token Refreshed Successfully",
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const logoutUser = async (req: Request, res: Response) => {
  try {
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

    res.status(200).send({
      success: true,
      statusCode: 200,
      message: "User logged out successfully",
      data: null,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  const payload = req.body;

  await authReset.forgotPassword(payload);

  res.status(200).json({
    success: true,
    message: `OTP Sent To Email : ${payload.email}`,
    data: null,
  });
};

const resetPassword = async (req: Request, res: Response) => {
  const payload = req.body;

  await authReset.resetPassword(payload);

  res.status(200).json({
    success: true,
    message: "Password Changed Successfully",
    data: null,
  });
};

const myInfo = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const user = await authService.myInfo(userId as string);

    res.status(200).json({
      success: true,
      message: "User info fetched successfully",
      data: user,
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const authController = {
  loginUser,
  logoutUser,
  refreshToken,
  forgotPassword,
  resetPassword,
  myInfo,
};
