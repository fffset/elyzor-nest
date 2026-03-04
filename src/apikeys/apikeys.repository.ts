import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IApiKey } from './apikeys.types';

@Injectable()
export class ApiKeyRepository {
  constructor(@InjectModel('ApiKey') private readonly apiKeyModel: Model<IApiKey>) {}

  async findByProject(projectId: string): Promise<IApiKey[]> {
    return this.apiKeyModel.find({ projectId }, { secretHash: 0 });
  }

  async findByIdAndProject(id: string, projectId: string): Promise<IApiKey | null> {
    return this.apiKeyModel.findOne({ _id: id, projectId });
  }

  async findBySecretHash(secretHash: string): Promise<IApiKey | null> {
    return this.apiKeyModel.findOne({ secretHash });
  }

  async create(data: {
    projectId: string;
    publicPart: string;
    secretHash: string;
    label: string;
  }): Promise<IApiKey> {
    return this.apiKeyModel.create(data);
  }

  async revoke(id: string, projectId: string): Promise<void> {
    await this.apiKeyModel.updateOne({ _id: id, projectId }, { revoked: true });
  }

  async deleteByProject(projectId: string): Promise<void> {
    await this.apiKeyModel.deleteMany({ projectId });
  }
}
