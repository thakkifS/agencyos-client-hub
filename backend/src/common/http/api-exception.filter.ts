import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Unhandled API error (${exception instanceof Error ? exception.name : "unknown"}); inspect runtime configuration and database availability.`);
    }
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof raw === "string" ? raw : raw && typeof raw === "object" && "message" in raw
      ? (raw as { message: string | string[] }).message
      : status === HttpStatus.INTERNAL_SERVER_ERROR ? "An unexpected error occurred" : "Request could not be completed";
    const details = typeof message === "string" ? {} : { errors: message };
    const humanMessage = Array.isArray(message) ? "Request validation failed" : message;
    const suppliedCode = raw && typeof raw === "object" && "code" in raw ? (raw as { code?: unknown }).code : undefined;
    const code = typeof suppliedCode === "string" ? suppliedCode : status === 400 ? "VALIDATION_ERROR" : status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
    response.status(status).json({ success: false, message: humanMessage, code, details });
  }
}
