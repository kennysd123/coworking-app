import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaOrmEntity } from './infrastructure/persistence/sala.orm-entity';
import { SalaTypeOrmRepository } from './infrastructure/persistence/sala-typeorm.repository';
import { CreateSalaUseCase } from './application/use-cases/create-sala.use-case';
import { GetSalasUseCase } from './application/use-cases/get-salas.use-case';
import { UpdateSalaUseCase } from './application/use-cases/update-sala.use-case';
import { SalasController } from './infrastructure/http/salas.controller';
import { SALA_REPOSITORY } from './domain/ports/sala.repository';

@Module({
  imports: [TypeOrmModule.forFeature([SalaOrmEntity])],
  controllers: [SalasController],
  providers: [
    { provide: SALA_REPOSITORY, useClass: SalaTypeOrmRepository },
    CreateSalaUseCase,
    GetSalasUseCase,
    UpdateSalaUseCase,
  ],
})
export class SalasModule {}
