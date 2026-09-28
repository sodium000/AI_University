import { client, generateOTP } from "../../../lib/redis/redis";
import { db } from "../../../prisma/db";
import ejs from "ejs";
import path from "path";
import { transporter } from "../../../lib/nodmiller/nosmiller";
import bcrypt from "bcryptjs";
import config from "../../../config";
import { jwtUtils } from "../../../utils/createJwtToken";
import { SignOptions } from "jsonwebtoken";
import { AppError } from "../../../errors/AppError";
import { ErrorCode } from "../../../errors/errorCodes";

interface CreateUserPayloade {
  name: string;
  email: string;
  password: string;
  role?: string;
  emailVerified?: boolean;
  phone?: string;
}

const verifyUser = async (payloade: CreateUserPayloade) => {
  const isUserExists = await db.orm.public.User.where({
    email: payloade.email,
  }).first();

  if (isUserExists) {
    throw AppError.conflict(
      "An account with this email already exists. Try logging in instead.",
      ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      { hint: "Use POST /api/v1/login if you already registered." },
    );
  }

  const hashedPassword = await bcrypt.hash(
    payloade.password,
    Number(config.bcrypt_salt_rounds),
  );

  const userData = {
    ...payloade,
    password: hashedPassword,
    credential: "EMAIL" as const,
  };
  await client.set(`user:${payloade.email}`, JSON.stringify(userData), {
    EX: 20 * 60,
  });

  const otp = generateOTP();

  await client.set(`otp:${payloade.email}`, otp, {
    EX: 5 * 60,
  });

  const templatePath = path.join(process.cwd(), "src/Templated/sendOtp.ejs");

  const html = await ejs.renderFile(templatePath, {
    name: payloade.name,
    otp,
    expiresIn: 5,
    year: new Date().getFullYear(),
  });

  const info = await transporter.sendMail({
    from: '"University Management System" <team@example.com>', // sender address
    to: payloade.email,
    subject: "University Management System - Email Verification", // subject line
    text: "Verify your email", // plain text body
    html: html, // HTML body
  });

  if (!info.messageId) {
    throw AppError.internal("Failed to send verification email.", {
      hint: "Check SMTP settings (EMAIL_SENDER, APP_PASSWORD) and Nodemailer connectivity.",
    });
  }
};

interface RegestrtionUserPayloade {
  email: string;
  otp: string;
}

const RegestrtionUser = async (payloade: RegestrtionUserPayloade) => {
  const isUserExists = await client.get(`user:${payloade.email}`);
  if (!isUserExists) {
    throw AppError.badRequest(
      "Registration session expired (20 minutes). Start again from verifyUser.",
      ErrorCode.AUTH_REGISTRATION_SESSION_EXPIRED,
    );
  }
  const correctOtp = await client.get(`otp:${payloade.email}`);
  if (!correctOtp) {
    throw AppError.badRequest(
      "OTP expired (5 minutes). Request a new code via verifyUser.",
      ErrorCode.AUTH_OTP_EXPIRED,
    );
  }
  if (correctOtp !== payloade.otp) {
    throw AppError.badRequest(
      "The OTP you entered is incorrect.",
      ErrorCode.AUTH_OTP_INVALID,
      { hint: "Use the latest 6-digit code from your email." },
    );
  }

  const user = JSON.parse(isUserExists);

  const { name, email, password, role, phone, credential } = user;
  // create user
  const CreateUser = await db.orm.public.User.create({
    name,
    email,
    password,
    role,
    emailVerified: true,
    phone,
    credential,
  });
  // delete user and otp from redis
  await client.del(`user:${payloade.email}`);
  await client.del(`otp:${payloade.email}`);

  const jwtPaylode = {
    id: CreateUser.id,
    name: CreateUser.name,
    email: CreateUser.email,
    role: CreateUser.role,
    photo: CreateUser.photoUrl || "",
  };

  const accessToken = jwtUtils.createToken(
    jwtPaylode,
    config.jwt_access_secret!,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPaylode,
    config.jwt_refresh_secret!,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

export const authService = {
  verifyUser,
  RegestrtionUser,
};
