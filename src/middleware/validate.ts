import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "../errors/AppError";
import { ErrorCode } from "../errors/errorCodes";

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return next(
        AppError.badRequest(
          "Request body validation failed. Fix the fields listed in error.details.",
          ErrorCode.VALIDATION_FAILED,
          {
            details: fieldErrors,
            hint: "Compare your JSON body with the schema for this endpoint in api_reference.md.",
          },
        ),
      );
    }

    req.body = result.data;
    next();
  };
