import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel('User') private readonly userModel: Model<IUser>) {}

  async findByEmail(email: string): Promise<IUser | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return this.userModel.findById(id);
  }

  async create(data: { email: string; passwordHash: string }): Promise<IUser> {
    return this.userModel.create(data);
  }
}
