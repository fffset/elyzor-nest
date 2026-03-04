import { Controller, Post, Req, Res, HttpCode, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { VerifyServiceService } from './verify-service.service';
import { IpRateLimiterGuard } from '../common/guards/ip-rate-limiter.guard';

@Controller('verify/service')
@UseGuards(IpRateLimiterGuard)
export class VerifyServiceController {
  constructor(private readonly verifyServiceService: VerifyServiceService) {}

  @Post()
  @HttpCode(200)
  async verify(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = req.ip ?? req.socket?.remoteAddress ?? '';
    const result = await this.verifyServiceService.verify(req.headers.authorization, ip);

    if (!result.valid) {
      const statusMap: Record<string, number> = {
        invalid_key: 401,
        service_revoked: 403,
        rate_limit_exceeded: 429,
      };
      const status = result.error ? (statusMap[result.error] ?? 401) : 401;
      res.status(status);
    }

    return result;
  }
}
