import { Request, Response, Router } from "express";
import { client, generateOTP } from "./redis";

const router = Router();

const giveotp = router.post("/getotp", async (req: Request, res: Response) => {
  const getOtp = generateOTP();

  await client.set("otp1 ", getOtp, {
    EX: 5 * 60,
  });

  res.status(200).json({
    success: true,
    message: "otp send",
    data: getOtp,
  });
});

export default giveotp;
