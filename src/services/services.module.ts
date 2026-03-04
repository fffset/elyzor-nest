import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { serviceSchema } from './services.model';
import { ServiceRepository } from './services.repository';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Service', schema: serviceSchema }]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [ServicesController],
  providers: [ServiceRepository, ServicesService],
  exports: [ServiceRepository, ServicesService],
})
export class ServicesModule {}
