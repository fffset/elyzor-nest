import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IService } from './services.types';

@Injectable()
export class ServiceRepository {
  constructor(@InjectModel('Service') private readonly serviceModel: Model<IService>) {}

  async findByProject(projectId: string): Promise<IService[]> {
    return this.serviceModel.find({ projectId }, { keyHash: 0 });
  }

  async findByKeyHash(keyHash: string): Promise<IService | null> {
    return this.serviceModel.findOne({ keyHash });
  }

  async findByIdAndProject(id: string, projectId: string): Promise<IService | null> {
    return this.serviceModel.findOne({ _id: id, projectId });
  }

  async findByNameAndProject(name: string, projectId: string): Promise<IService | null> {
    return this.serviceModel.findOne({ name, projectId });
  }

  async create(data: {
    projectId: string;
    name: string;
    keyHash: string;
    publicPart: string;
  }): Promise<IService> {
    return this.serviceModel.create(data);
  }

  async revoke(id: string, projectId: string): Promise<void> {
    await this.serviceModel.updateOne({ _id: id, projectId }, { revokedAt: new Date() });
  }

  async deleteByProject(projectId: string): Promise<void> {
    await this.serviceModel.deleteMany({ projectId });
  }
}
