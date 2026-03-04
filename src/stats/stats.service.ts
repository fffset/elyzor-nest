import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { UsageRepository } from '../usage/usage.repository';
import { ProjectStatsResponse, StatsRange } from './stats.types';

const RANGE_DAYS: Record<StatsRange, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
};

@Injectable()
export class StatsService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly usageRepo: UsageRepository,
  ) {}

  async getProjectStats(
    userId: string,
    projectId: string,
    range: StatsRange,
  ): Promise<ProjectStatsResponse> {
    await this.projectsService.assertOwnership(userId, projectId);

    const days = RANGE_DAYS[range];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.usageRepo.getStats(projectId, since);

    const successRate =
      stats.totalRequests > 0
        ? Math.round((stats.successCount / stats.totalRequests) * 1000) / 1000
        : 0;

    return {
      totalRequests: stats.totalRequests,
      successRate,
      topKeys: stats.topKeys,
      requestsByDay: stats.requestsByDay,
      rateLimitHits: stats.rateLimitHits,
      avgLatencyMs: stats.avgLatencyMs,
    };
  }
}
