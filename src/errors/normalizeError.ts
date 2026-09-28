import { AppError } from "./AppError";
import { ErrorCode, type ErrorCodeValue } from "./errorCodes";

export interface NormalizedError {
  statusCode: number;
  message: string;
  code: ErrorCodeValue;
  details?: unknown;
  hint?: string;
  stack?: string;
}

const DEFAULT_HINTS: Partial<Record<ErrorCodeValue, string>> = {
  [ErrorCode.VALIDATION_FAILED]:
    "Check error.details for field-level validation messages.",
  [ErrorCode.NOT_FOUND]:
    "Confirm the resource ID in the URL or body exists in the database.",
  [ErrorCode.CONFLICT]:
    "The request conflicts with existing data (duplicate email, ID, or code).",
  [ErrorCode.UNAUTHORIZED]:
    "Send a valid Bearer token or auth cookies on protected routes.",
  [ErrorCode.FORBIDDEN]:
    "Your user role or ownership does not allow this action.",
  [ErrorCode.AUTH_REGISTRATION_SESSION_EXPIRED]:
    "Call POST /api/v1/auth/verifyUser again to restart registration and receive a new OTP.",
  [ErrorCode.AUTH_OTP_EXPIRED]:
    "Request a new OTP via POST /api/v1/auth/verifyUser.",
};

function inferStatusCodeFromMessage(message: string): number {
  const msg = message.toLowerCase();

  if (
    msg.includes("forbidden") ||
    msg.includes("do not teach") ||
    msg.includes("do not own") ||
    msg.includes("do not have permission")
  ) {
    return 403;
  }

  if (
    msg.includes("not authorized") ||
    msg.includes("unauthorized") ||
    msg.includes("token") ||
    msg.includes("password is incorrect") ||
    msg.includes("invalid email or password") ||
    msg.includes("blocked") ||
    msg.includes("suspended") ||
    (msg.includes("inactive") && msg.includes("account"))
  ) {
    return 401;
  }

  if (msg.includes("not found") || msg.includes("does not exist")) {
    return 404;
  }

  if (
    msg.includes("already exists") ||
    msg.includes("already been") ||
    msg.includes("already paid") ||
    msg.includes("already enrolled") ||
    msg.includes("already in use") ||
    msg.includes("already taken")
  ) {
    return 409;
  }

  if (
    msg.includes("required") ||
    msg.includes("invalid") ||
    msg.includes("please provide") ||
    msg.includes("missing") ||
    msg.includes("time out") ||
    msg.includes("timeout") ||
    msg.includes("expired") ||
    msg.includes("otp") ||
    msg.includes("capacity") ||
    msg.includes("cannot pay") ||
    msg.includes("cannot record")
  ) {
    return 400;
  }

  return 500;
}

function inferCodeFromStatus(statusCode: number, message: string): ErrorCodeValue {
  const msg = message.toLowerCase();

  if (msg.includes("otp")) {
    if (msg.includes("expired") || msg.includes("time out")) {
      return ErrorCode.AUTH_OTP_EXPIRED;
    }
    return ErrorCode.AUTH_OTP_INVALID;
  }
  if (msg.includes("already exists") && msg.includes("email")) {
    return ErrorCode.AUTH_EMAIL_ALREADY_EXISTS;
  }
  if (msg.includes("blocked")) return ErrorCode.AUTH_ACCOUNT_BLOCKED;
  if (msg.includes("suspended")) return ErrorCode.AUTH_ACCOUNT_SUSPENDED;
  if (msg.includes("inactive") && msg.includes("account")) {
    return ErrorCode.AUTH_ACCOUNT_INACTIVE;
  }
  if (msg.includes("password is incorrect")) {
    return ErrorCode.AUTH_INVALID_CREDENTIALS;
  }

  switch (statusCode) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    default:
      return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}

export function normalizeError(
  error: unknown,
  fallbackMessage = "Request failed",
): NormalizedError {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint ?? DEFAULT_HINTS[error.code],
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    const statusCode = inferStatusCodeFromMessage(error.message);
    const code = inferCodeFromStatus(statusCode, error.message);
    return {
      statusCode,
      message: error.message || fallbackMessage,
      code,
      hint: DEFAULT_HINTS[code],
      stack: error.stack,
    };
  }

  return {
    statusCode: 500,
    message: fallbackMessage,
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    hint: "Inspect server logs for the underlying exception.",
  };
}
