import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedError } from '../../errors';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw (err instanceof Error ? err : null) ?? new UnauthorizedError('Yetkilendirme gerekli');
    }
    return user;
  }
}
