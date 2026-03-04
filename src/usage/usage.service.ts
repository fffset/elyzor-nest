import { Injectable, Logger } from '@nestjs/common';
import { UsageRepository } from './usage.repository';
import { UsageLogDto } from './usage.types';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly usageRepo: UsageRepository) {}

  log(dto: UsageLogDto): void {
    this.usageRepo.create(dto).catch((err: Error) => {
      this.logger.error({ err }, 'Usage log write failed');
    });
  }
}
