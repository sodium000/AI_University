import { Request, Response } from "express";

const Registration = async (req: Request, res: Response) => {
  res.status(200).json({
    message: "okkkRegistration",
  });
};

export const authController = {
  Registration,
};
