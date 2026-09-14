import { Request, Response } from "express";
import { authService } from "./regestration.service";

const UserVarify = async (req: Request, res: Response) => {
  const payload = req.body;

  try {
    const result = await authService.verifyUser(payload);
    res.status(200).json({
      message: "Otp send your mail. Please verifyed your Id",
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const RegestrationUser = async (req: Request, res: Response) => {
  const payload = req.body;

  try {
    const { accessToken, refreshToken } =
      await authService.RegestrtionUser(payload);

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
      message: "User Regestration successfully",
      data: { accessToken, refreshToken },
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const authController = {
  UserVarify,
  RegestrationUser,
};
