import bcrypt from "bcryptjs";
import { jwtUtils } from "../../../utils/createJwtToken";
import config from "../../../config";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { db } from "../../../prisma/db";
import { AppError } from "../../../errors/AppError";
import { ErrorCode } from "../../../errors/errorCodes";

interface LoginUser {
  email: string;
  password: string;
}

const loginUser = async (playlode: LoginUser) => {
  const { email, password } = playlode;

  const user = await db.orm.public.User.where({ email }).first();

  if (!user) {
    throw AppError.unauthorized(
      "Invalid email or password.",
      ErrorCode.AUTH_INVALID_CREDENTIALS,
    );
  }

  if (user.status === "BLOCKED") {
    throw AppError.forbidden(
      "Your account has been blocked. Please contact support.",
      ErrorCode.AUTH_ACCOUNT_BLOCKED,
    );
  }
  if (user.status === "SUSPENDED") {
    throw AppError.forbidden(
      "Your account has been suspended. Please contact support.",
      ErrorCode.AUTH_ACCOUNT_SUSPENDED,
    );
  }
  if (user.status === "INACTIVE") {
    throw AppError.forbidden(
      "Your account is inactive. Please contact support.",
      ErrorCode.AUTH_ACCOUNT_INACTIVE,
    );
  }

  if (!user.password) {
    throw AppError.badRequest(
      "This account has no password set. Use your OAuth provider or reset your password.",
      ErrorCode.BAD_REQUEST,
    );
  }

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw AppError.unauthorized(
      "Invalid email or password.",
      ErrorCode.AUTH_INVALID_CREDENTIALS,
    );
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
    throw AppError.unauthorized(
      "Refresh token is invalid or expired.",
      ErrorCode.AUTH_TOKEN_INVALID,
      { hint: "Login again with POST /api/v1/login." },
    );
  }

  const { id } = verifiedRefreshToken.data as JwtPayload;

  const user = await db.orm.public.User.where({ id }).first();

  if (!user) {
    throw AppError.notFound(
      "User linked to this refresh token no longer exists.",
      ErrorCode.NOT_FOUND,
    );
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
