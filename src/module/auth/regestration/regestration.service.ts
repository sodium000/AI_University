import { client, generateOTP } from "../../../lib/redis/redis";
import { db } from "../../../prisma/db";
import ejs from "ejs";
import path from "path";
import { transporter } from "../../../lib/nodmiller/nosmiller";
import bcrypt from "bcryptjs";
import config from "../../../config";
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

const sendVerificationOtp = async (name: string, email: string, otp: string) => {
  const templatePath = path.join(process.cwd(), "src/Templated/sendOtp.ejs");
  const html = await ejs.renderFile(templatePath, {
    name,
    otp,
    expiresIn: 5,
    year: new Date().getFullYear(),
  });

  const info = await transporter.sendMail({
    from: '"University Management System" <team@example.com>',
    to: email,
    subject: "University Management System - Email Verification",
    text: "Verify your email",
    html,
  });

  if (!info.messageId) {
    throw AppError.internal("Failed to send verification email.", {
      hint: "Check SMTP settings (EMAIL_SENDER, APP_PASSWORD) and Nodemailer connectivity.",
    });
  }
};

const verifyUser = async (payloade: CreateUserPayloade) => {
  const isUserExists = await db.orm.public.User.where({
    email: payloade.email,
  }).first();

  if (isUserExists) {
    throw AppError.conflict(
      "An account with this email already exists. Try logging in instead.",
      ErrorCode.AUTH_EMAIL_ALREADY_EXISTS,
      { hint: "you already registered." },
    );
  }

  const hashedPassword = await bcrypt.hash(
    payloade.password,
    Number(config.bcrypt_salt_rounds),
  );

  const userData = {
    ...payloade,
    role: "STUDENT" as const,
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

  await sendVerificationOtp(payloade.name, payloade.email, otp);
};

const resendOtp = async (email: string) => {
  const pendingUserJson = await client.get(`user:${email}`);
  if (!pendingUserJson) {
    throw AppError.badRequest(
      "Registration session expired. Start registration again to receive a new OTP.",
      ErrorCode.AUTH_REGISTRATION_SESSION_EXPIRED,
    );
  }

  const pendingUser = JSON.parse(pendingUserJson) as CreateUserPayloade;
  const otp = generateOTP();
  await client.set(`otp:${email}`, otp, { EX: 5 * 60 });
  await sendVerificationOtp(pendingUser.name, email, otp);
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

  const { name, email, password, phone, credential } = user;
  // create user
  const CreateUser = await db.orm.public.User.create({
    name,
    email,
    password,
    role: "STUDENT",
    status: "INACTIVE",
    emailVerified: true,
    phone,
    credential,
  });
  // delete user and otp from redis
  await client.del(`user:${payloade.email}`);
  await client.del(`otp:${payloade.email}`);

  return {
    pendingApproval: true,
    user: {
      id: CreateUser.id,
      name: CreateUser.name,
      email: CreateUser.email,
      role: CreateUser.role,
      status: CreateUser.status,
    },
  };
};

export const authService = {
  verifyUser,
  RegestrtionUser,
  resendOtp,
};
