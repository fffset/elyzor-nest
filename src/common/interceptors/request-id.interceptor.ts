import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const id = (req.headers['x-request-id'] as string) ?? randomUUID();
    (req as unknown as Record<string, unknown>)['requestId'] = id;
    res.setHeader('X-Request-Id', id);
    return next.handle();
  }
}
