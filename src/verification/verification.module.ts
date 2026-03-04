import { Module, forwardRef } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { ApiKeysModule } from '../apikeys/apikeys.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [forwardRef(() => ApiKeysModule), UsageModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
