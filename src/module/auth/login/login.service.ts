import bcrypt from "bcryptjs";
import { jwtUtils } from "../../../utils/createJwtToken";
import config from "../../../config";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { db } from "../../../prisma/db";

interface LoginUser {
  email: string;
  password: string;
}

const loginUser = async (playlode: LoginUser) => {
  const { email, password } = playlode;

  const user = await db.orm.public.User.where({ email }).first();

  if (user?.status === "BLOCKED") {
    throw new Error("Your account has been blocked. Please contact support.");
  }
  if (user?.status === "SUSPENDED") {
    throw new Error("Your account has been suspended. Please contact support.");
  }
  if (user?.status === "INACTIVE") {
    throw new Error("Your account is inactive. Please contact support.");
  }

  const isPasswordMatched = await bcrypt.compare(password, user?.password!);

  if (!isPasswordMatched) {
    throw new Error("Password is incorrect");
  }

  const jwtPayload = {
    id: user?.id,
    name: user?.name,
    email: user?.email,
    role: user?.role,
    photo: user?.photoUrl,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret!,
    config.jwt_access_expires_in as SignOptions,
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret!,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (refreshToken: string) => {
  const verifiedRefreshToken = jwtUtils.verifyToken(
    refreshToken,
    config.jwt_refresh_secret!,
  );

  if (!verifiedRefreshToken.success) {
    throw new Error(verifiedRefreshToken.error);
  }

  const { id } = verifiedRefreshToken.data as JwtPayload;

  const user = await db.orm.public.User.where({ id }).first();

  const jwtPayload = {
    id: user?.id,
    name: user?.name,
    email: user?.email,
    role: user?.role,
    photo: user?.photoUrl,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret!,
    config.jwt_access_expires_in as SignOptions,
  );

  const newRefreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret!,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return {
    accessToken,
    newRefreshToken,
  };
};

const myInfo = async (userId: string) => {
  const user = await db.orm.public.User.where({ id: userId })
    .select(
      "id",
      "name",
      "email",
      "phone",
      "role",
      "emailVerified",
      "credential",
      "createdAt",
      "updatedAt",
    )
    .first();

  return user;
};

export const authService = {
  loginUser,
  refreshToken,
  myInfo,
};
