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
    const result = await authService.RegestrtionUser(payload);
    res.status(200).json({
      message: "Registration successful",
      data: result,
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
