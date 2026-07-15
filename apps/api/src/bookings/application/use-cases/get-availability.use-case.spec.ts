import { GetAvailabilityUseCase } from './get-availability.use-case';
import type { IBookingRepository, OccupiedSlot } from '../../domain/ports/booking.repository';

const SALA = '11111111-1111-4111-a111-111111111111';
const desde = new Date('2024-06-01T00:00:00Z');
const hasta  = new Date('2024-06-02T00:00:00Z');

function makeRepo(slots: OccupiedSlot[] = []): IBookingRepository {
  return {
    hasOverlap: jest.fn(),
    save: jest.fn(),
    acquireUserLock: jest.fn(),
    countActiveByUser: jest.fn(),
    countByUserInMonth: jest.fn(),
    findOccupiedSlots: jest.fn().mockResolvedValue(slots),
    findByUser: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
    runInTransaction: jest.fn(),
  } as unknown as IBookingRepository;
}

describe('GetAvailabilityUseCase', () => {
  it('retorna lista vacía cuando no hay reservas en el rango', async () => {
    const repo = makeRepo([]);
    const result = await new GetAvailabilityUseCase(repo).execute({ salaId: SALA, desde, hasta });

    expect(result).toEqual([]);
    expect(repo.findOccupiedSlots).toHaveBeenCalledWith(SALA, desde, hasta);
  });

  it('retorna los slots ocupados ordenados por inicio (delegación directa al repositorio)', async () => {
    const slots: OccupiedSlot[] = [
      { inicio: new Date('2024-06-01T10:00:00Z'), fin: new Date('2024-06-01T12:00:00Z') },
      { inicio: new Date('2024-06-01T14:00:00Z'), fin: new Date('2024-06-01T16:00:00Z') },
    ];
    const repo = makeRepo(slots);
    const result = await new GetAvailabilityUseCase(repo).execute({ salaId: SALA, desde, hasta });

    expect(result).toHaveLength(2);
    expect(result[0].inicio).toEqual(slots[0].inicio);
    expect(result[1].inicio).toEqual(slots[1].inicio);
  });
});
