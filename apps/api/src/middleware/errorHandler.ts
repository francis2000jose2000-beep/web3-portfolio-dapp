import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";

export class AppError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

type ErrorResponse = {
  message: string;
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message } satisfies ErrorResponse);
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ message: err.message } satisfies ErrorResponse);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: err.message } satisfies ErrorResponse);
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ message: err.message } satisfies ErrorResponse);
    return;
  }

  res.status(500).json({ message: "Internal Server Error" } satisfies ErrorResponse);
}

