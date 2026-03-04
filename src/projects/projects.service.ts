import { Injectable } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { IProject } from './projects.types';
import { CreateProjectDto } from './dtos/create-project.dto';
import { NotFoundError } from '../errors';
import { ApiKeyRepository } from '../apikeys/apikeys.repository';
import { ServiceRepository } from '../services/services.repository';
import { UsageRepository } from '../usage/usage.repository';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectRepo: ProjectsRepository,
    private readonly apiKeyRepo: ApiKeyRepository,
    private readonly serviceRepo: ServiceRepository,
    private readonly usageRepo: UsageRepository,
  ) {}

  async listProjects(userId: string): Promise<IProject[]> {
    return this.projectRepo.findAllByUser(userId);
  }

  async createProject(userId: string, dto: CreateProjectDto): Promise<IProject> {
    return this.projectRepo.create({ userId, name: dto.name.trim() });
  }

  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await this.projectRepo.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundError('Proje bulunamadı');

    await Promise.all([
      this.apiKeyRepo.deleteByProject(projectId),
      this.serviceRepo.deleteByProject(projectId),
      this.usageRepo.deleteByProject(projectId),
    ]);
    await this.projectRepo.deleteByIdAndUser(projectId, userId);
  }

  async assertOwnership(userId: string, projectId: string): Promise<IProject> {
    const project = await this.projectRepo.findByIdAndUser(projectId, userId);
    if (!project) throw new NotFoundError('Proje bulunamadı');
    return project;
  }
}
