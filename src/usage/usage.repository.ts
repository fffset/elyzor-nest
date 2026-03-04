import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IUsage, UsageLogDto } from './usage.types';

export interface DayBucket {
  date: string;
  count: number;
  errors: number;
}

export interface TopKey {
  keyId: string;
  keyType: 'api' | 'service';
  requests: number;
}

export interface StatsAggregate {
  totalRequests: number;
  successCount: number;
  rateLimitHits: number;
  avgLatencyMs: number;
  requestsByDay: DayBucket[];
  topKeys: TopKey[];
}

@Injectable()
export class UsageRepository {
  constructor(@InjectModel('Usage') private readonly usageModel: Model<IUsage>) {}

  async create(dto: UsageLogDto): Promise<IUsage> {
    return this.usageModel.create(dto);
  }

  async deleteByProject(projectId: string): Promise<void> {
    await this.usageModel.deleteMany({ projectId });
  }

  async getStats(projectId: string, since: Date): Promise<StatsAggregate> {
    const projectOid = new Types.ObjectId(projectId);

    const [summary, byDay, topApiKeys, topServiceKeys] = await Promise.all([
      this.usageModel.aggregate([
        { $match: { projectId: projectOid, timestamp: { $gte: since } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            successCount: { $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] } },
            rateLimitHits: { $sum: { $cond: [{ $eq: ['$result', 'rate_limited'] }, 1, 0] } },
            avgLatencyMs: { $avg: '$latencyMs' },
          },
        },
      ]),

      this.usageModel.aggregate([
        { $match: { projectId: projectOid, timestamp: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [
                  { $in: ['$result', ['invalid_key', 'revoked', 'rate_limited', 'error']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      this.usageModel.aggregate([
        {
          $match: {
            projectId: projectOid,
            timestamp: { $gte: since },
            apiKeyId: { $exists: true, $ne: null },
          },
        },
        { $group: { _id: '$apiKeyId', requests: { $sum: 1 } } },
        { $sort: { requests: -1 } },
        { $limit: 5 },
      ]),

      this.usageModel.aggregate([
        {
          $match: {
            projectId: projectOid,
            timestamp: { $gte: since },
            serviceId: { $exists: true, $ne: null },
          },
        },
        { $group: { _id: '$serviceId', requests: { $sum: 1 } } },
        { $sort: { requests: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const s = summary[0] as
      | { totalRequests: number; successCount: number; rateLimitHits: number; avgLatencyMs: number }
      | undefined;

    const allKeys: TopKey[] = [
      ...(topApiKeys as Array<{ _id: Types.ObjectId; requests: number }>).map((k) => ({
        keyId: k._id.toString(),
        keyType: 'api' as const,
        requests: k.requests,
      })),
      ...(topServiceKeys as Array<{ _id: Types.ObjectId; requests: number }>).map((k) => ({
        keyId: k._id.toString(),
        keyType: 'service' as const,
        requests: k.requests,
      })),
    ];
    allKeys.sort((a, b) => b.requests - a.requests);

    return {
      totalRequests: s?.totalRequests ?? 0,
      successCount: s?.successCount ?? 0,
      rateLimitHits: s?.rateLimitHits ?? 0,
      avgLatencyMs: Math.round((s?.avgLatencyMs ?? 0) * 10) / 10,
      requestsByDay: (byDay as Array<{ _id: string; count: number; errors: number }>).map((b) => ({
        date: b._id,
        count: b.count,
        errors: b.errors,
      })),
      topKeys: allKeys.slice(0, 5),
    };
  }
}
