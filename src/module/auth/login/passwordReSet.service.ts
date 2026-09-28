import config from "../../../config";
import { transporter } from "../../../lib/nodmiller/nosmiller";
import crypto from "crypto";
import { client } from "../../../lib/redis/redis";
import path from "path";
import ejs from "ejs";
import { db } from "../../../prisma/db";
import bcrypt from "bcryptjs";
import { AppError } from "../../../errors/AppError";
import { ErrorCode } from "../../../errors/errorCodes";

const forgotPassword = async (payload: { email: string }) => {
  const { email } = payload;

  const user = await db.orm.public.User.where({ email }).first();

  if (!user) {
    throw AppError.notFound(
      "No account found for this email address.",
      ErrorCode.NOT_FOUND,
    );
  }

  if (user.status === "BLOCKED") {
    throw AppError.forbidden(
      "Your account has been blocked. Password reset is not available.",
      ErrorCode.AUTH_ACCOUNT_BLOCKED,
    );
  }

  if (!user.emailVerified) {
    throw AppError.badRequest(
      "Email is not verified. Complete registration before resetting password.",
      ErrorCode.BAD_REQUEST,
    );
  }

  if (user.status === "INACTIVE") {
    throw AppError.forbidden(
      "Your account is inactive. Please contact support.",
      ErrorCode.AUTH_ACCOUNT_INACTIVE,
    );
  }

  if (user.credential === "GOOGLE") {
    throw AppError.badRequest(
      "This account uses Google sign-in. Reset the password through Google instead.",
      ErrorCode.BAD_REQUEST,
    );
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  const key = `forgor-password-otp:${user.email}`;

  await client.set(key, otp, {
    EX: 5 * 60,
  });

  const tempatePath = path.join(
    process.cwd(),
    "src/Templated/forgot-password.ejs",
  );

  const templateData = {
    name: user.name,
    otp: otp,
    expiresIn: "5 minutes",
    year: new Date().getFullYear(),
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.emailSender,
    to: user.email,
    subject: "Forgot Password",
    html,
  });
};

const resetPassword = async (payload: {
  email: string;
  otp: string;
  newPassword: string;
}) => {
  const { email, otp, newPassword } = payload;

  const user = await db.orm.public.User.where({ email }).first();

  if (!user) {
    throw AppError.notFound(
      "No account found for this email address.",
      ErrorCode.NOT_FOUND,
    );
  }

  if (user.status === "BLOCKED") {
    throw AppError.forbidden(
      "Your account has been blocked. Password reset is not available.",
      ErrorCode.AUTH_ACCOUNT_BLOCKED,
    );
  }

  if (!user.emailVerified) {
    throw AppError.badRequest(
      "Email is not verified. Complete registration before resetting password.",
      ErrorCode.BAD_REQUEST,
    );
  }

  if (user.status === "INACTIVE") {
    throw AppError.forbidden(
      "Your account is inactive. Please contact support.",
      ErrorCode.AUTH_ACCOUNT_INACTIVE,
    );
  }

  if (user.credential === "GOOGLE") {
    throw AppError.badRequest(
      "This account uses Google sign-in. Reset the password through Google instead.",
      ErrorCode.BAD_REQUEST,
    );
  }

  const key = `forgor-password-otp:${user.email}`;

  const redisOtp = await client.get(key);

  if (!redisOtp) {
    throw AppError.badRequest(
      "Password reset OTP expired. Request a new code via forgot-password.",
      ErrorCode.AUTH_OTP_EXPIRED,
    );
  }

  if (redisOtp !== otp) {
    throw AppError.badRequest(
      "The OTP you entered does not match.",
      ErrorCode.AUTH_OTP_INVALID,
    );
  }

  const hashedNewPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await db.orm.public.User.where({ email }).update({
    password: hashedNewPassword,
  });

  await client.del([key]);

  const tempatePath = path.join(
    process.cwd(),
    "src/Templated/reset-password-success.ejs",
  );

  const templateData = {
    name: user.name,
    year: new Date().getFullYear(),
  };

  const html = await ejs.renderFile(tempatePath, templateData);

  await transporter.sendMail({
    from: config.emailSender,
    to: user.email,
    subject: "Password Changed",
    html,
  });
};

export const authReset = { forgotPassword, resetPassword };
