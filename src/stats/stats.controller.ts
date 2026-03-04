import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsRange } from './stats.types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const VALID_RANGES: StatsRange[] = ['1d', '7d', '30d'];

@Controller('projects/:projectId/stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
    @Query('range') rawRange?: string,
  ) {
    const range: StatsRange =
      VALID_RANGES.includes(rawRange as StatsRange) ? (rawRange as StatsRange) : '7d';
    return this.statsService.getProjectStats(userId, projectId, range);
  }
}
