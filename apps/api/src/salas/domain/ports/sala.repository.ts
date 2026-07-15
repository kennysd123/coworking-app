import type { Sala } from '../entities/sala.entity';

export interface ISalaRepository {
  save(sala: Sala): Promise<void>;
  findById(id: string): Promise<Sala | null>;
  findAll(): Promise<Sala[]>;
  update(sala: Sala): Promise<void>;
}

export const SALA_REPOSITORY = Symbol('ISalaRepository');
