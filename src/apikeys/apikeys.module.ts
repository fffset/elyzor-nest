import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { apiKeySchema } from './apikeys.model';
import { ApiKeyRepository } from './apikeys.repository';
import { ApiKeyService } from './apikeys.service';
import { ApiKeysController } from './apikeys.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'ApiKey', schema: apiKeySchema }]),
    forwardRef(() => ProjectsModule),
  ],
  controllers: [ApiKeysController],
  providers: [ApiKeyRepository, ApiKeyService],
  exports: [ApiKeyRepository, ApiKeyService],
})
export class ApiKeysModule {}
