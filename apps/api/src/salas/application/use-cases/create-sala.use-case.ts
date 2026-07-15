import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Sala } from '../../domain/entities/sala.entity';
import { ISalaRepository, SALA_REPOSITORY } from '../../domain/ports/sala.repository';

export interface CreateSalaCommand {
  nombre: string;
  capacidad: number;
  ubicacion: string;
  activa?: boolean;
}

export class CreateSalaUseCase {
  constructor(
    @Inject(SALA_REPOSITORY)
    private readonly salaRepo: ISalaRepository,
  ) {}

  async execute(command: CreateSalaCommand): Promise<Sala> {
    const sala = Sala.create({
      id: randomUUID(),
      nombre: command.nombre,
      capacidad: command.capacidad,
      ubicacion: command.ubicacion,
      activa: command.activa ?? true,
    });
    await this.salaRepo.save(sala);
    return sala;
  }
}
