import { Response } from "express";
import { normalizeError } from "../errors/normalizeError";

const isDev = process.env.NODE_ENV !== "production";

export function sendSuccess(
  res: Response,
  statusCode: number,
  message: string,
  data: unknown = null,
) {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
}

export function sendFailure(
  res: Response,
  error: unknown,
  fallbackMessage: string,
) {
  const normalized = normalizeError(error, fallbackMessage);

  const body: Record<string, unknown> = {
    success: false,
    statusCode: normalized.statusCode,
    message: normalized.message,
    data: null,
    error: {
      code: normalized.code,
      ...(normalized.details !== undefined && { details: normalized.details }),
      ...(normalized.hint && { hint: normalized.hint }),
      ...(isDev &&
        normalized.stack && { debug: { stack: normalized.stack } }),
    },
  };

  return res.status(normalized.statusCode).json(body);
}
