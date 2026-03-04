import { Global, Module, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from './env';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const logger = new Logger('RedisModule');
        const client = new Redis(env.redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        client.on('error', (err) => logger.error({ err }, 'Redis error'));
        client.on('connect', () => logger.log('Redis connected'));
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
