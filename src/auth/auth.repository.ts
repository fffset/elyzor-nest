import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IRefreshToken } from './auth.model';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel('RefreshToken') private readonly refreshTokenModel: Model<IRefreshToken>,
  ) {}

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<IRefreshToken> {
    return this.refreshTokenModel.create(data);
  }

  async findRefreshToken(tokenHash: string): Promise<IRefreshToken | null> {
    return this.refreshTokenModel.findOne({ tokenHash, revokedAt: null });
  }

  async findRefreshTokenAny(tokenHash: string): Promise<IRefreshToken | null> {
    return this.refreshTokenModel.findOne({ tokenHash });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.refreshTokenModel.updateOne({ tokenHash }, { revokedAt: new Date() });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }
}
