import crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { ApiKeyRepository } from './apikeys.repository';
import { ProjectsService } from '../projects/projects.service';
import { NotFoundError, ForbiddenError } from '../errors';
import { CreatedApiKeyResponse, ApiKeyResponse } from './apikeys.types';
import { CreateApiKeyDto } from './dtos/create-apikey.dto';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly apiKeyRepo: ApiKeyRepository,
    private readonly projectsService: ProjectsService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private generateKey(): { publicPart: string; secretPart: string; fullKey: string } {
    const publicPart = crypto.randomBytes(8).toString('hex');
    const secretPart = crypto.randomBytes(32).toString('hex');
    const fullKey = `sk_live_${publicPart}.${secretPart}`;
    return { publicPart, secretPart, fullKey };
  }

  private hashSecret(secretPart: string): string {
    return crypto.createHash('sha256').update(secretPart).digest('hex');
  }

  async listKeys(userId: string, projectId: string): Promise<ApiKeyResponse[]> {
    await this.projectsService.assertOwnership(userId, projectId);
    const keys = await this.apiKeyRepo.findByProject(projectId);
    return keys.map((k) => ({
      id: k._id.toString(),
      projectId: k.projectId.toString(),
      publicPart: k.publicPart,
      label: k.label,
      revoked: k.revoked,
      createdAt: k.createdAt,
    }));
  }

  async createKey(
    userId: string,
    projectId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreatedApiKeyResponse> {
    await this.projectsService.assertOwnership(userId, projectId);

    const { publicPart, secretPart, fullKey } = this.generateKey();
    const secretHash = this.hashSecret(secretPart);

    const key = await this.apiKeyRepo.create({
      projectId,
      publicPart,
      secretHash,
      label: dto.label ?? '',
    });

    return {
      id: key._id.toString(),
      projectId: key.projectId.toString(),
      publicPart,
      label: key.label,
      revoked: false,
      createdAt: key.createdAt,
      key: fullKey,
    };
  }

  async revokeKey(userId: string, projectId: string, keyId: string): Promise<void> {
    await this.projectsService.assertOwnership(userId, projectId);

    const key = await this.apiKeyRepo.findByIdAndProject(keyId, projectId);
    if (!key) throw new NotFoundError('API key bulunamadı');
    if (key.revoked) throw new ForbiddenError('Bu key zaten iptal edilmiş');

    await this.apiKeyRepo.revoke(keyId, projectId);
    await this.redis.del(`apikey:${key.secretHash}`);
  }

  async rotateKey(
    userId: string,
    projectId: string,
    keyId: string,
  ): Promise<CreatedApiKeyResponse> {
    await this.projectsService.assertOwnership(userId, projectId);

    const existing = await this.apiKeyRepo.findByIdAndProject(keyId, projectId);
    if (!existing) throw new NotFoundError('API key bulunamadı');
    if (existing.revoked) throw new ForbiddenError('Revoke edilmiş key rotate edilemez');

    const { publicPart, secretPart, fullKey } = this.generateKey();
    const secretHash = this.hashSecret(secretPart);

    const newKey = await this.apiKeyRepo.create({
      projectId,
      publicPart,
      secretHash,
      label: existing.label,
    });

    await this.apiKeyRepo.revoke(keyId, projectId);
    await this.redis.del(`apikey:${existing.secretHash}`);

    return {
      id: newKey._id.toString(),
      projectId: newKey.projectId.toString(),
      publicPart,
      label: newKey.label,
      revoked: false,
      createdAt: newKey.createdAt,
      key: fullKey,
    };
  }
}
