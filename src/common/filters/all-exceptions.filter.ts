import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppError } from '../../errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppError) {
      return response.status(exception.statusCode).json({
        error: exception.code,
        message: exception.message,
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let message: string;
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const msg = (body as { message: unknown }).message;
        message = Array.isArray(msg) ? msg.join(', ') : String(msg);
      } else {
        message = typeof body === 'string' ? body : 'İstek geçersiz';
      }
      return response.status(status).json({ error: 'validation_error', message });
    }

    this.logger.error(exception);
    return response.status(500).json({
      error: 'internal_error',
      message: 'Sunucu hatası',
    });
  }
}
