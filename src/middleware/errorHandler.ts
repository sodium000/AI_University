import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { ErrorCode } from "../errors/errorCodes";
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
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (res.headersSent) {
    return;
  }

  return sendFailure(
    res,
    error,
    "An unexpected error occurred while processing your request.",
  );
};
