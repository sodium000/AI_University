import config from "../../../config";
import { transporter } from "../../../lib/nodmiller/nosmiller";
import crypto from "crypto";
import { client } from "../../../lib/redis/redis";
import path from "path";
import ejs from "ejs";
import { db } from "../../../prisma/db";
import bcrypt from "bcryptjs";

const forgotPassword = async (payload: { email: string }) => {
  const { email } = payload;

  const user = await db.orm.public.User.where({ email }).first();

  if (!user) {
    throw new Error("User Does Not Exist!");
  }

  if (user.status === "BLOCKED") {
    throw new Error("User is Blocked");
  }

  if (!user.emailVerified) {
    throw new Error("User Not Verified");
  }

  if (user.status === "INACTIVE") {
    throw new Error("User is Inactive");
  }

  if (user.credential === "GOOGLE") {
    throw new Error("User Has Account With Google");
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
    throw new Error("User Does Not Exist!");
  }

  if (user.status === "BLOCKED") {
    throw new Error("User is Blocked");
  }

  if (!user.emailVerified) {
    throw new Error("User Not Verified");
  }

  if (user.status === "INACTIVE") {
    throw new Error("User is Inactive");
  }

  if (user.credential === "GOOGLE") {
    throw new Error("User Has Account With Google");
  }

  const key = `forgor-password-otp:${user.email}`;

  const redisOtp = await client.get(key);

  if (!redisOtp) {
    throw new Error("Invalid OTP");
  }

  if (redisOtp !== otp) {
    throw new Error("OTP Does Not Match");
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
