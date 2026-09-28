import { NextFunction, Request, Response } from "express";
import { jwtUtils } from "../utils/createJwtToken";
import config from "../config";
import { db } from "../prisma/db";
import { JwtPayload } from "jsonwebtoken";
import { AppError } from "../errors/AppError";
import { ErrorCode } from "../errors/errorCodes";
import { sendFailure } from "../utils/apiResponse";

export interface AuthRequest extends Request {
  user?: any;
  student?: any;
  faculty?: any;
}

export const auth = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken =
        authHeader && authHeader.startsWith("Bearer ")
          ? authHeader.split(" ")[1]
          : null;

      const token = bearerToken || req.cookies?.accessToken;

      if (!token) {
        return sendFailure(
          res,
          AppError.unauthorized(
            "Authentication required: no access token was provided.",
            ErrorCode.AUTH_TOKEN_MISSING,
            {
              hint: 'Send Authorization: Bearer <accessToken> or include the accessToken cookie.',
            },
          ),
          "Unauthorized",
        );
      }

      const verifiedToken = jwtUtils.verifyToken(
        token,
        config.jwt_access_secret!,
      );

      if (!verifiedToken.success) {
        return sendFailure(
          res,
          AppError.unauthorized(
            "Access token is invalid or expired.",
            ErrorCode.AUTH_TOKEN_INVALID,
            { hint: "Refresh the token or log in again." },
          ),
          "Unauthorized",
        );
      }

      const decoded = verifiedToken.data as JwtPayload;

      const user = await db.orm.public.User.where({ id: decoded.id }).first();

      if (!user) {
        return sendFailure(
          res,
          AppError.notFound(
            "The user for this token no longer exists.",
            ErrorCode.NOT_FOUND,
          ),
          "User not found",
        );
      }

      if (user.status === "BLOCKED") {
        return sendFailure(
          res,
          AppError.forbidden(
            "Your account has been blocked. Please contact support.",
            ErrorCode.AUTH_ACCOUNT_BLOCKED,
          ),
          "Account blocked",
        );
      }

      if (user.status === "SUSPENDED") {
        return sendFailure(
          res,
          AppError.forbidden(
            "Your account is suspended. Please contact support.",
            ErrorCode.AUTH_ACCOUNT_SUSPENDED,
          ),
          "Account suspended",
        );
      }

      if (user.status === "INACTIVE") {
        return sendFailure(
          res,
          AppError.forbidden(
            "Your account is inactive. Please contact support.",
            ErrorCode.AUTH_ACCOUNT_INACTIVE,
          ),
          "Account inactive",
        );
      }

      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(user.role as string)
      ) {
        return sendFailure(
          res,
          AppError.forbidden(
            `This route requires one of these roles: ${requiredRoles.join(", ")}. Your role is ${user.role}.`,
            ErrorCode.FORBIDDEN,
            {
              hint: "Use an account with the correct role or adjust route guards in the route file.",
            },
          ),
          "Forbidden",
        );
      }

      (req as AuthRequest).user = user;

      if (user.role === "STUDENT") {
        const student = await db.orm.public.Student.where({
          userId: user.id,
        }).first();
        (req as AuthRequest).student = student;
      }

      if (user.role === "FACULTY") {
        const faculty = await db.orm.public.Faculty.where({
          userId: user.id,
        }).first();
        (req as AuthRequest).faculty = faculty;
      }

      next();
    } catch (error: unknown) {
      return sendFailure(
        res,
        error,
        "Authentication middleware failed unexpectedly.",
      );
    }
  };
};
