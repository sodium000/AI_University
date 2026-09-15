import { NextFunction, Request, Response } from "express";
import { jwtUtils } from "../utils/createJwtToken";
import config from "../config";
import { db } from "../prisma/db";
import { JwtPayload } from "jsonwebtoken";

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
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: "You are not authorized! No token provided.",
          data: null,
        });
      }

      const verifiedToken = jwtUtils.verifyToken(
        token,
        config.jwt_access_secret!,
      );

      if (!verifiedToken.success) {
        return res.status(401).json({
          success: false,
          statusCode: 401,
          message: "Unauthorized! Token is invalid or expired.",
          data: null,
        });
      }

      const decoded = verifiedToken.data as JwtPayload;

      const user = await db.orm.public.User.where({ id: decoded.id }).first();

      if (!user) {
        return res.status(404).json({
          success: false,
          statusCode: 404,
          message: "User account not found!",
          data: null,
        });
      }

      if (user.status === "BLOCKED") {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Your account has been blocked. Please contact support.",
          data: null,
        });
      }

      if (user.status === "SUSPENDED") {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Your account is suspended. Please contact support.",
          data: null,
        });
      }

      if (user.status === "INACTIVE") {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Your account is inactive. Please contact support.",
          data: null,
        });
      }

      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(user.role as string)
      ) {
        return res.status(403).json({
          success: false,
          statusCode: 403,
          message: "Forbidden! You do not have permission to access this resource.",
          data: null,
        });
      }

      (req as AuthRequest).user = user;

      // If user is a student, attach student profile
      if (user.role === "STUDENT") {
        const student = await db.orm.public.Student.where({
          userId: user.id,
        }).first();
        (req as AuthRequest).student = student;
      }

      // If user is a faculty, attach faculty profile
      if (user.role === "FACULTY") {
        const faculty = await db.orm.public.Faculty.where({
          userId: user.id,
        }).first();
        (req as AuthRequest).faculty = faculty;
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: error.message || "Internal Server Error during authorization",
        data: null,
      });
    }
  };
};
