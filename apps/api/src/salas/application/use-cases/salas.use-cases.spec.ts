import { CreateSalaUseCase } from './create-sala.use-case';
import { GetSalasUseCase } from './get-salas.use-case';
import { UpdateSalaUseCase } from './update-sala.use-case';
import { SalaNotFoundException } from '../../domain/exceptions/sala-not-found.exception';
import type { ISalaRepository } from '../../domain/ports/sala.repository';
import type { Sala } from '../../domain/entities/sala.entity';

function makeRepo(overrides: Partial<Record<keyof ISalaRepository, jest.Mock>> = {}): jest.Mocked<ISalaRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<ISalaRepository>;
}

describe('CreateSalaUseCase', () => {
  it('crea y persiste una sala con activa=true por defecto', async () => {
    const repo = makeRepo();
    const result = await new CreateSalaUseCase(repo).execute({
      nombre: 'Sala A',
      capacidad: 10,
      ubicacion: 'Piso 1',
    });

    expect(result.nombre).toBe('Sala A');
    expect(result.capacidad).toBe(10);
    expect(result.activa).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Sala A' }));
  });

  it('respeta activa=false cuando se especifica', async () => {
    const repo = makeRepo();
    const result = await new CreateSalaUseCase(repo).execute({
      nombre: 'Sala B',
      capacidad: 5,
      ubicacion: 'Piso 2',
      activa: false,
    });
    expect(result.activa).toBe(false);
  });
});

describe('GetSalasUseCase', () => {
  it('retorna la lista del repositorio', async () => {
    const mockSala = { id: 'uuid', nombre: 'A', capacidad: 1, ubicacion: 'P1', activa: true } as unknown as Sala;
    const repo = makeRepo({ findAll: jest.fn().mockResolvedValue([mockSala]) });

    const result = await new GetSalasUseCase(repo).execute();
    expect(result).toHaveLength(1);
    expect(repo.findAll).toHaveBeenCalled();
  });
});

describe('UpdateSalaUseCase', () => {
  const existingSala = { id: 'sala-id', nombre: 'Antigua', capacidad: 5, ubicacion: 'P1', activa: true,
    update: jest.fn().mockReturnValue({ id: 'sala-id', nombre: 'Nueva', capacidad: 10, ubicacion: 'P1', activa: true }),
  } as unknown as Sala;

  it('actualiza y persiste la sala existente', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(existingSala) });
    const result = await new UpdateSalaUseCase(repo).execute({ id: 'sala-id', nombre: 'Nueva', capacidad: 10 });

    expect(repo.findById).toHaveBeenCalledWith('sala-id');
    expect(repo.update).toHaveBeenCalled();
    expect(result.nombre).toBe('Nueva');
  });

  it('lanza SalaNotFoundException si la sala no existe', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });

    await expect(
      new UpdateSalaUseCase(repo).execute({ id: 'no-existe' }),
    ).rejects.toBeInstanceOf(SalaNotFoundException);
  });
});
