import { error } from "console";
import { client, generateOTP } from "../../../lib/redis/redis";
import { db } from "../../../prisma/db";
import ejs from "ejs";
import path from "path";
import { transporter } from "../../../lib/nodmiller/nosmiller";

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
    throw new Error("User with this email already exists");
  }

  const userData = { ...payloade, credential: "EMAIL" as const };
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
    throw new Error("Failed to send email");
  }
};

interface RegestrtionUserPayloade {
  email: string;
  otp: string;
}

const RegestrtionUser = async (payloade: RegestrtionUserPayloade) => {
  const isUserExists = await client.get(`user:${payloade.email}`);
  if (!isUserExists) {
    throw new Error("You get time out. Try again");
  }
  // check otp in redis database
  const correctOtp = await client.get(`otp:${payloade.email}`);
  if (!correctOtp) {
    throw new Error("Time Out Resend the otp");
  }
  if (correctOtp !== payloade.otp) {
    throw new Error("Invalid OTP");
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
  console.log("Create User", CreateUser);
  // delete user and otp from redis
  await client.del(`user:${payloade.email}`);
  await client.del(`otp:${payloade.email}`);

  return CreateUser;
};

export const authService = {
  verifyUser,
  RegestrtionUser,
};
