import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService, REFRESH_COOKIE } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RawToken } from '../common/decorators/raw-token.decorator';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE, result.token.refreshToken, COOKIE_OPTIONS);
    return { user: result.user, accessToken: result.token.accessToken };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return response;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    const { accessToken, refreshToken } = await this.authService.refresh(rawRefreshToken);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logout(
    @RawToken() accessToken: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    await this.authService.logout(accessToken, rawRefreshToken);
    res.clearCookie(REFRESH_COOKIE);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logoutAll(
    @CurrentUser('userId') userId: string,
    @RawToken() accessToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(userId, accessToken);
    res.clearCookie(REFRESH_COOKIE);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }
}
