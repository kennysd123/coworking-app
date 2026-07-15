import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { UserTypeOrmRepository } from './infrastructure/persistence/user-typeorm.repository';
import { USER_REPOSITORY } from './domain/ports/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserTypeOrmRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
