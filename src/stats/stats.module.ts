import { Module, forwardRef } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { ProjectsModule } from '../projects/projects.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [forwardRef(() => ProjectsModule), UsageModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
