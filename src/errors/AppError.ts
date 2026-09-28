import { ErrorCode, type ErrorCodeValue } from "./errorCodes";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCodeValue;
  readonly details?: unknown;
  readonly hint?: string;

  constructor(
    statusCode: number,
    message: string,
    code: ErrorCodeValue = ErrorCode.BAD_REQUEST,
    options?: { details?: unknown; hint?: string },
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.hint = options?.hint;
  }

  static badRequest(
    message: string,
    code: ErrorCodeValue = ErrorCode.BAD_REQUEST,
    options?: { details?: unknown; hint?: string },
  ) {
    return new AppError(400, message, code, options);
  }

  static unauthorized(
    message: string,
    code: ErrorCodeValue = ErrorCode.UNAUTHORIZED,
    options?: { details?: unknown; hint?: string },
  ) {
    return new AppError(401, message, code, options);
  }

  static forbidden(
    message: string,
    code: ErrorCodeValue = ErrorCode.FORBIDDEN,
    options?: { details?: unknown; hint?: string },
  ) {
    return new AppError(403, message, code, options);
  }

  static notFound(
    message: string,
    code: ErrorCodeValue = ErrorCode.NOT_FOUND,
    options?: { details?: unknown; hint?: string },
  ) {
    return new AppError(404, message, code, options);
  }

  static conflict(
    message: string,
    code: ErrorCodeValue = ErrorCode.CONFLICT,
    options?: { details?: unknown; hint?: string },
  ) {
    return new AppError(409, message, code, options);
  }

  static internal(
    message = "An unexpected error occurred. Please try again later.",
    options?: { details?: unknown; hint?: string },
  ) {
    return new AppError(
      500,
      message,
      ErrorCode.INTERNAL_SERVER_ERROR,
      options,
    );
  }
}
