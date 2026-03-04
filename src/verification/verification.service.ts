import crypto from 'crypto';
import { Injectable, Inject, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { ApiKeyRepository } from '../apikeys/apikeys.repository';
import { UsageService } from '../usage/usage.service';
import { env } from '../config/env';
import { VerifyResult, CachedKeyData } from './verification.types';

const CACHE_TTL = 300;

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly apiKeyRepo: ApiKeyRepository,
    private readonly usageService: UsageService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private extractKey(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const key = authHeader.slice(7).trim();
    if (!key || key.length > 200) return null;
    return key;
  }

  private parseKey(fullKey: string): { publicPart: string; secretPart: string } | null {
    if (!fullKey.startsWith('sk_live_')) return null;
    const withoutPrefix = fullKey.slice('sk_live_'.length);
    const dotIndex = withoutPrefix.indexOf('.');
    if (dotIndex === -1) return null;
    const publicPart = withoutPrefix.slice(0, dotIndex);
    const secretPart = withoutPrefix.slice(dotIndex + 1);
    if (!publicPart || !secretPart) return null;
    return { publicPart, secretPart };
  }

  private hashSecret(secretPart: string): string {
    return crypto.createHash('sha256').update(secretPart).digest('hex');
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  }

  private cacheKey(secretHash: string): string {
    return `apikey:${secretHash}`;
  }

  private async lookupFromDb(secretHash: string): Promise<CachedKeyData | null> {
    const key = await this.apiKeyRepo.findBySecretHash(secretHash);
    if (!key) return null;

    if (!this.timingSafeCompare(secretHash, key.secretHash)) return null;

    const cached: CachedKeyData = {
      id: key._id.toString(),
      projectId: key.projectId.toString(),
      revoked: key.revoked,
    };

    await this.redis.setex(this.cacheKey(secretHash), CACHE_TTL, JSON.stringify(cached));
    return cached;
  }

  private async checkRateLimit(
    projectId: string,
  ): Promise<{ exceeded: boolean; remaining: number; retryAfter: number }> {
    const rateLimitKey = `ratelimit:key:${projectId}`;
    const { max, windowSeconds } = env.rateLimit.key;

    const current = await this.redis.incr(rateLimitKey);
    if (current === 1) await this.redis.expire(rateLimitKey, windowSeconds);

    const ttl = await this.redis.ttl(rateLimitKey);
    const remaining = Math.max(0, max - current);

    return { exceeded: current > max, remaining, retryAfter: ttl };
  }

  async verify(authHeader: string | undefined, ip: string): Promise<VerifyResult> {
    const start = Date.now();

    const fullKey = this.extractKey(authHeader);
    if (!fullKey) return { valid: false, error: 'invalid_key' };

    const parsed = this.parseKey(fullKey);
    if (!parsed) return { valid: false, error: 'invalid_key' };

    const secretHash = this.hashSecret(parsed.secretPart);

    let keyData: CachedKeyData | null;
    try {
      const cached = await this.redis.get(this.cacheKey(secretHash));
      keyData = cached
        ? (JSON.parse(cached) as CachedKeyData)
        : await this.lookupFromDb(secretHash);
    } catch (err) {
      this.logger.error({ err }, 'Verification error');
      return { valid: false, error: 'invalid_key' };
    }

    if (!keyData) return { valid: false, error: 'invalid_key' };

    if (keyData.revoked) {
      this.usageService.log({
        projectId: keyData.projectId,
        apiKeyId: keyData.id,
        result: 'revoked',
        latencyMs: Date.now() - start,
        ip,
      });
      return { valid: false, error: 'key_revoked' };
    }

    let rateLimit: { exceeded: boolean; remaining: number; retryAfter: number };
    try {
      rateLimit = await this.checkRateLimit(keyData.projectId);
    } catch (err) {
      this.logger.error({ err }, 'Rate limit error');
      return { valid: false, error: 'invalid_key' };
    }

    if (rateLimit.exceeded) {
      this.usageService.log({
        projectId: keyData.projectId,
        apiKeyId: keyData.id,
        result: 'rate_limited',
        latencyMs: Date.now() - start,
        ip,
      });
      return { valid: false, error: 'rate_limit_exceeded', retryAfter: rateLimit.retryAfter };
    }

    this.usageService.log({
      projectId: keyData.projectId,
      apiKeyId: keyData.id,
      result: 'success',
      latencyMs: Date.now() - start,
      ip,
    });

    return {
      valid: true,
      projectId: keyData.projectId,
      rateLimitRemaining: rateLimit.remaining,
    };
  }
}
