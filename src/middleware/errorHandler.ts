import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { ErrorCode } from "../errors/errorCodes";
import { normalizeError } from "../errors/normalizeError";
import { sendFailure } from "../utils/apiResponse";

export const notFoundHandler = (req: Request, res: Response) => {
  return sendFailure(
    res,
    AppError.notFound(
      `Route ${req.method} ${req.originalUrl} was not found on this server.`,
      ErrorCode.ROUTE_NOT_FOUND,
      {
        hint: "Check the HTTP method and path against api_reference.md or your route files.",
      },
    ),
    "Route not found",
  );
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const normalized = normalizeError(
    error,
    "An unexpected error occurred while processing your request.",
  );
  if (normalized.statusCode >= 500) {
    console.error(
      `[API ${normalized.statusCode}] ${req.method} ${req.path}: ${normalized.message}`,
      normalized.stack || "",
    );
  }

  if (res.headersSent) {
    return;
  }

  return sendFailure(
    res,
    error,
    "An unexpected error occurred while processing your request.",
  );
};
