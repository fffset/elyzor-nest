import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { ApiKeysModule } from '../apikeys/apikeys.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [ApiKeysModule, UsageModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
