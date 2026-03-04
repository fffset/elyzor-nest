import { Controller, Get, Inject, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { Response } from 'express';
import type Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const mongoOk = this.connection.readyState === 1;
    let redisOk = false;
    try {
      await this.redis.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }

    const allOk = mongoOk && redisOk;
    res.status(allOk ? 200 : 503);

    return {
      status: allOk ? 'ok' : 'degraded',
      mongo: mongoOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
    };
  }
}
