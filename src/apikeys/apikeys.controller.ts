import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyService } from './apikeys.service';
import { CreateApiKeyDto } from './dtos/create-apikey.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  listKeys(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.apiKeyService.listKeys(userId, projectId);
  }

  @Post()
  @HttpCode(201)
  createKey(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeyService.createKey(userId, projectId, dto);
  }

  @Delete(':keyId')
  @HttpCode(204)
  async revokeKey(
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.apiKeyService.revokeKey(userId, projectId, keyId);
  }

  @Post(':keyId/rotate')
  @HttpCode(200)
  rotateKey(
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.apiKeyService.rotateKey(userId, projectId, keyId);
  }
}
