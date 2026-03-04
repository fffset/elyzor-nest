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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dtos/create-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(@CurrentUser('userId') userId: string) {
    return this.projectsService.listProjects(userId);
  }

  @Post()
  @HttpCode(201)
  createProject(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteProject(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    await this.projectsService.deleteProject(userId, id);
  }
}
