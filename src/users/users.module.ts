import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { userSchema } from './users.model';
import { UsersRepository } from './users.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'User', schema: userSchema }])],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
