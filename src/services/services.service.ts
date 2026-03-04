import crypto from 'crypto';
import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { ServiceRepository } from './services.repository';
import { ProjectsService } from '../projects/projects.service';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors';
import { ServiceResponse, CreatedServiceResponse } from './services.types';
import { CreateServiceDto } from './dtos/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly serviceRepo: ServiceRepository,
    private readonly projectsService: ProjectsService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private generateKey(): { publicPart: string; secretPart: string; fullKey: string } {
    const publicPart = crypto.randomBytes(8).toString('hex');
    const secretPart = crypto.randomBytes(32).toString('hex');
    const fullKey = `svc_live_${publicPart}.${secretPart}`;
    return { publicPart, secretPart, fullKey };
  }

  private hashSecret(secretPart: string): string {
    return crypto.createHash('sha256').update(secretPart).digest('hex');
  }

  async listServices(userId: string, projectId: string): Promise<ServiceResponse[]> {
    await this.projectsService.assertOwnership(userId, projectId);
    const services = await this.serviceRepo.findByProject(projectId);
    return services.map((s) => ({
      id: s._id.toString(),
      projectId: s.projectId.toString(),
      name: s.name,
      publicPart: s.publicPart,
      revoked: s.revokedAt != null,
      createdAt: s.createdAt,
    }));
  }

  async createService(
    userId: string,
    projectId: string,
    dto: CreateServiceDto,
  ): Promise<CreatedServiceResponse> {
    await this.projectsService.assertOwnership(userId, projectId);

    const existing = await this.serviceRepo.findByNameAndProject(dto.name, projectId);
    if (existing) throw new ValidationError('Servis adı zaten kullanımda');

    const { publicPart, secretPart, fullKey } = this.generateKey();
    const keyHash = this.hashSecret(secretPart);

    const service = await this.serviceRepo.create({ projectId, name: dto.name, keyHash, publicPart });

    return {
      id: service._id.toString(),
      projectId: service.projectId.toString(),
      name: service.name,
      publicPart,
      revoked: false,
      createdAt: service.createdAt,
      key: fullKey,
    };
  }

  async revokeService(userId: string, projectId: string, serviceId: string): Promise<void> {
    await this.projectsService.assertOwnership(userId, projectId);

    const service = await this.serviceRepo.findByIdAndProject(serviceId, projectId);
    if (!service) throw new NotFoundError('Servis bulunamadı');
    if (service.revokedAt != null) throw new ForbiddenError('Bu servis zaten iptal edilmiş');

    await this.serviceRepo.revoke(serviceId, projectId);
    await this.redis.del(`svckey:${service.keyHash}`);
  }

  async rotateService(
    userId: string,
    projectId: string,
    serviceId: string,
  ): Promise<CreatedServiceResponse> {
    await this.projectsService.assertOwnership(userId, projectId);

    const existing = await this.serviceRepo.findByIdAndProject(serviceId, projectId);
    if (!existing) throw new NotFoundError('Servis bulunamadı');
    if (existing.revokedAt != null) throw new ForbiddenError('Revoke edilmiş servis rotate edilemez');

    const { publicPart, secretPart, fullKey } = this.generateKey();
    const keyHash = this.hashSecret(secretPart);

    const newService = await this.serviceRepo.create({
      projectId,
      name: existing.name,
      keyHash,
      publicPart,
    });

    await this.serviceRepo.revoke(serviceId, projectId);
    await this.redis.del(`svckey:${existing.keyHash}`);

    return {
      id: newService._id.toString(),
      projectId: newService.projectId.toString(),
      name: newService.name,
      publicPart,
      revoked: false,
      createdAt: newService.createdAt,
      key: fullKey,
    };
  }
}
