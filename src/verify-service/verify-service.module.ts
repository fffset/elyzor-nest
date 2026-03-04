import { Module } from '@nestjs/common';
import { VerifyServiceService } from './verify-service.service';
import { VerifyServiceController } from './verify-service.controller';
import { ServicesModule } from '../services/services.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [ServicesModule, UsageModule],
  controllers: [VerifyServiceController],
  providers: [VerifyServiceService],
})
export class VerifyServiceModule {}
