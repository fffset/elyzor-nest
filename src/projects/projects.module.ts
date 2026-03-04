import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { projectSchema } from './projects.model';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ApiKeysModule } from '../apikeys/apikeys.module';
import { ServicesModule } from '../services/services.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Project', schema: projectSchema }]),
    forwardRef(() => ApiKeysModule),
    forwardRef(() => ServicesModule),
    UsageModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
