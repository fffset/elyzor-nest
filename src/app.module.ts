import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { RedisModule } from './config/redis.module';
import { env } from './config/env';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { ApiKeysModule } from './apikeys/apikeys.module';
import { ServicesModule } from './services/services.module';
import { UsageModule } from './usage/usage.module';
import { VerificationModule } from './verification/verification.module';
import { VerifyServiceModule } from './verify-service/verify-service.module';
import { StatsModule } from './stats/stats.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    MongooseModule.forRoot(env.mongoUri),
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: {
          ignore: (req) => (req as { url?: string }).url === '/v1/health',
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    RedisModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ApiKeysModule,
    ServicesModule,
    UsageModule,
    VerificationModule,
    VerifyServiceModule,
    StatsModule,
    HealthModule,
  ],
})
export class AppModule {}
