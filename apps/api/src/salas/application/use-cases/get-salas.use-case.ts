import { Inject } from '@nestjs/common';
import { Sala } from '../../domain/entities/sala.entity';
import { ISalaRepository, SALA_REPOSITORY } from '../../domain/ports/sala.repository';

export class GetSalasUseCase {
  constructor(
    @Inject(SALA_REPOSITORY)
    private readonly salaRepo: ISalaRepository,
  ) {}

  async execute(): Promise<Sala[]> {
    return this.salaRepo.findAll();
  }
}
