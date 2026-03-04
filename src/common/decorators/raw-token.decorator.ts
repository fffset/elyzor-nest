import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const RawToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization ?? '';
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  },
);
