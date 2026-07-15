import { Inject } from '@nestjs/common';
import { Sala } from '../../domain/entities/sala.entity';
import { SalaNotFoundException } from '../../domain/exceptions/sala-not-found.exception';
import { ISalaRepository, SALA_REPOSITORY } from '../../domain/ports/sala.repository';

export interface UpdateSalaCommand {
  id: string;
  nombre?: string;
  capacidad?: number;
  ubicacion?: string;
  activa?: boolean;
}

export class UpdateSalaUseCase {
  constructor(
    @Inject(SALA_REPOSITORY)
    private readonly salaRepo: ISalaRepository,
  ) {}

  async execute(command: UpdateSalaCommand): Promise<Sala> {
    const existing = await this.salaRepo.findById(command.id);
    if (!existing) {
      throw new SalaNotFoundException(command.id);
    }

    const updated = existing.update({
      nombre: command.nombre,
      capacidad: command.capacidad,
      ubicacion: command.ubicacion,
      activa: command.activa,
    });

    await this.salaRepo.update(updated);
    return updated;
  }
}
