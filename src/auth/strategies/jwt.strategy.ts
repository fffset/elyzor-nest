import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../errors';

interface JwtPayload {
  userId: string;
  email: string;
  tokenType: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.jwt.secret,
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<{ userId: string; email: string }> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedError('Geçersiz token payload');
    }

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) throw new UnauthorizedError('Token bulunamadı');

    const blacklisted = await this.redis.get(`blacklist:${token}`).catch(() => null);
    if (blacklisted) throw new UnauthorizedError('Token iptal edilmiş');

    return { userId: payload.userId, email: payload.email };
  }
}
