import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IProject } from './projects.types';

@Injectable()
export class ProjectsRepository {
  constructor(@InjectModel('Project') private readonly projectModel: Model<IProject>) {}

  async findAllByUser(userId: string): Promise<IProject[]> {
    return this.projectModel.find({ userId });
  }

  async findByIdAndUser(id: string, userId: string): Promise<IProject | null> {
    return this.projectModel.findOne({ _id: id, userId });
  }

  async create(data: { name: string; userId: string }): Promise<IProject> {
    return this.projectModel.create(data);
  }

  async deleteByIdAndUser(id: string, userId: string): Promise<void> {
    await this.projectModel.findOneAndDelete({ _id: id, userId });
  }
}
