import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { usageSchema } from './usage.model';
import { UsageRepository } from './usage.repository';
import { UsageService } from './usage.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Usage', schema: usageSchema }])],
  providers: [UsageRepository, UsageService],
  exports: [UsageRepository, UsageService],
})
export class UsageModule {}
