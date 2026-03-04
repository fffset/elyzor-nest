import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { UsersRepository } from '../users/users.repository';
import { AuthRepository } from './auth.repository';
import { UnauthorizedError, ValidationError } from '../errors';
import { env } from '../config/env';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { generateAccessToken } from './services/token.service';
import { RegisterResponse, LoginResponse, RotatedRefreshResponse } from './auth.types';

const REFRESH_TOKEN_BYTES = 48;
export const REFRESH_COOKIE = 'refreshToken';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UsersRepository,
    private readonly authRepo: AuthRepository,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private blacklistKey(token: string): string {
    return `blacklist:${token}`;
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.authRepo.createRefreshToken({ userId, tokenHash, expiresAt });
    return refreshToken;
  }

  private async blacklistAccessToken(accessToken: string): Promise<void> {
    try {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.setex(this.blacklistKey(accessToken), ttl, '1');
        }
      }
    } catch {
      // token decode edilemese bile devam et
    }
  }

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ValidationError('Kayıt tamamlanamadı');

    const passwordHash = await bcrypt.hash(dto.password, env.bcryptRounds);
    const user = await this.userRepo.create({ email: dto.email, passwordHash });

    const userId = user._id.toString();
    const accessToken = generateAccessToken({ id: userId, email: user.email });
    const refreshToken = await this.issueRefreshToken(userId);

    return { user: { id: userId, email: user.email }, token: { accessToken, refreshToken } };
  }

  async login(dto: LoginDto): Promise<{ response: LoginResponse; refreshToken: string }> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedError('Geçersiz email veya şifre');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Geçersiz email veya şifre');

    const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
    const refreshToken = await this.issueRefreshToken(user._id.toString());

    return { response: { accessToken }, refreshToken };
  }

  async refresh(rawRefreshToken: string | undefined): Promise<RotatedRefreshResponse> {
    if (!rawRefreshToken) throw new UnauthorizedError('Refresh token gerekli');

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.authRepo.findRefreshTokenAny(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Geçersiz veya süresi dolmuş refresh token');
    }

    if (stored.revokedAt !== null) {
      await this.authRepo.revokeAllUserTokens(stored.userId.toString());
      await this.redis.del(`refresh:${tokenHash}`);
      throw new UnauthorizedError('Geçersiz veya süresi dolmuş refresh token');
    }

    const userId = stored.userId.toString();
    const user = await this.userRepo.findById(userId);
    if (!user) throw new UnauthorizedError('Kullanıcı bulunamadı');

    await this.authRepo.revokeRefreshToken(tokenHash);
    await this.redis.del(`refresh:${tokenHash}`);

    const accessToken = generateAccessToken({ id: user._id.toString(), email: user.email });
    const newRefreshToken = await this.issueRefreshToken(userId);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(accessToken: string, rawRefreshToken: string | undefined): Promise<void> {
    await this.blacklistAccessToken(accessToken);

    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.authRepo.revokeRefreshToken(tokenHash);
      await this.redis.del(`refresh:${tokenHash}`);
    }
  }

  async logoutAll(userId: string, accessToken: string): Promise<void> {
    await this.blacklistAccessToken(accessToken);
    await this.authRepo.revokeAllUserTokens(userId);
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new UnauthorizedError('Kullanıcı bulunamadı');
    return { id: user._id.toString(), email: user.email };
  }
}
