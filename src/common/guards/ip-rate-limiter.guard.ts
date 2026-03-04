import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';
import type Redis from 'ioredis';
import { env } from '../../config/env';

@Injectable()
export class IpRateLimiterGuard implements CanActivate {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const key = `ratelimit:ip:${ip}`;
    const { max, windowSeconds } = env.rateLimit.ip;

    let current: number;
    try {
      current = await this.redis.incr(key);
      if (current === 1) await this.redis.expire(key, windowSeconds);
    } catch {
      return true; // fail open
    }

    if (current > max) {
      const ttl = await this.redis.ttl(key).catch(() => windowSeconds);
      res.status(429).json({
        valid: false,
        error: 'rate_limit_exceeded',
        retryAfter: ttl,
      });
      return false;
    }

    return true;
  }
}
