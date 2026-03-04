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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dtos/create-service.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects/:projectId/services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  listServices(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.servicesService.listServices(userId, projectId);
  }

  @Post()
  @HttpCode(201)
  createService(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateServiceDto,
  ) {
    return this.servicesService.createService(userId, projectId, dto);
  }

  @Delete(':serviceId')
  @HttpCode(204)
  async revokeService(
    @Param('projectId') projectId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.servicesService.revokeService(userId, projectId, serviceId);
  }

  @Post(':serviceId/rotate')
  @HttpCode(200)
  rotateService(
    @Param('projectId') projectId: string,
    @Param('serviceId') serviceId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.servicesService.rotateService(userId, projectId, serviceId);
  }
}
