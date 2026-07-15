import { CreateBookingUseCase } from './create-booking.use-case';
import { BookingConflictException } from '../../domain/exceptions/booking-conflict.exception';
import { BookingDurationExceededException } from '../../domain/exceptions/booking-duration-exceeded.exception';
import { BookingTooFarInAdvanceException } from '../../domain/exceptions/booking-too-far-in-advance.exception';
import { SimultaneousBookingLimitExceededException } from '../../domain/exceptions/simultaneous-booking-limit-exceeded.exception';
import { MonthlyBookingLimitExceededException } from '../../domain/exceptions/monthly-booking-limit-exceeded.exception';
import type { IBookingRepository } from '../../domain/ports/booking.repository';
import type { IBookingEventPublisher } from '../../domain/ports/booking-event-publisher.port';

const noopPublisher: IBookingEventPublisher = {
  publishBookingCreated: jest.fn(),
  publishBookingCancelled: jest.fn(),
};

function makeRepo(
  overrides: Partial<Record<keyof IBookingRepository, jest.Mock>> = {},
): jest.Mocked<IBookingRepository> {
  const repo: jest.Mocked<IBookingRepository> = {
    hasOverlap: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockResolvedValue(undefined),
    acquireUserLock: jest.fn().mockResolvedValue(undefined),
    countActiveByUser: jest.fn().mockResolvedValue(0),
    countByUserInMonth: jest.fn().mockResolvedValue(0),
    findOccupiedSlots: jest.fn().mockResolvedValue([]),
    findByUser: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue([]),
    runInTransaction: jest.fn(),
  };
  repo.runInTransaction.mockImplementation(
    (fn: (r: IBookingRepository) => Promise<unknown>) => fn(repo),
  );
  Object.assign(repo, overrides);
  return repo;
}

const NOW     = new Date('2024-06-01T10:00:00Z');
const IN_8_DAYS = new Date('2024-06-09T10:00:00Z');

const cmd = {
  salaId: 'sala-uuid',
  userId: 'user-uuid',
  userRole: 'regular' as const,
  inicio: new Date('2024-06-04T10:00:00Z'), // 3 días → dentro del límite de 7d para regular
  fin:   new Date('2024-06-04T12:00:00Z'),  // 2h exactas → dentro del límite de regular
};

describe('CreateBookingUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    (noopPublisher.publishBookingCreated as jest.Mock).mockClear();
    (noopPublisher.publishBookingCancelled as jest.Mock).mockClear();
  });
  afterEach(() => jest.useRealTimers());

  const makeUseCase = (repo: IBookingRepository) =>
    new CreateBookingUseCase(repo, noopPublisher);

  // ── Tests existentes ───────────────────────────────────────────────────────

  it('crea la reserva cuando no hay solapamiento ni se violan límites', async () => {
    const repo = makeRepo();
    const result = await makeUseCase(repo).execute(cmd);

    expect(result.salaId).toBe(cmd.salaId);
    expect(result.estado).toBe('activa');
    expect(repo.acquireUserLock).toHaveBeenCalledWith(cmd.userId);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ salaId: cmd.salaId }));
  });

  it('lanza BookingConflictException cuando hasOverlap retorna true', async () => {
    const repo = makeRepo({ hasOverlap: jest.fn().mockResolvedValue(true) });
    await expect(makeUseCase(repo).execute(cmd)).rejects.toBeInstanceOf(BookingConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lanza BookingConflictException cuando save lanza exclusion_violation (23P01)', async () => {
    const pgError = Object.assign(new Error('exclusion_violation'), { code: '23P01' });
    const repo = makeRepo({ save: jest.fn().mockRejectedValue(pgError) });
    await expect(makeUseCase(repo).execute(cmd)).rejects.toBeInstanceOf(BookingConflictException);
  });

  it('re-lanza errores de BD no relacionados con conflicto', async () => {
    const dbError = Object.assign(new Error('connection lost'), { code: '08000' });
    const repo = makeRepo({ save: jest.fn().mockRejectedValue(dbError) });
    await expect(makeUseCase(repo).execute(cmd)).rejects.toThrow('connection lost');
  });

  // ── Tests de límites transaccionales ──────────────────────────────────────

  it('lanza SimultaneousBookingLimitExceededException cuando regular alcanza 2 activas', async () => {
    const repo = makeRepo({ countActiveByUser: jest.fn().mockResolvedValue(2) });
    await expect(makeUseCase(repo).execute(cmd)).rejects.toBeInstanceOf(SimultaneousBookingLimitExceededException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lanza MonthlyBookingLimitExceededException cuando regular alcanza 5 en el mes', async () => {
    const repo = makeRepo({ countByUserInMonth: jest.fn().mockResolvedValue(5) });
    await expect(makeUseCase(repo).execute(cmd)).rejects.toBeInstanceOf(MonthlyBookingLimitExceededException);
  });

  it('lanza BookingDurationExceededException cuando regular reserva más de 2 horas', async () => {
    const repo = makeRepo();
    const cmdLong = { ...cmd, fin: new Date('2024-06-04T12:01:00Z') };
    await expect(makeUseCase(repo).execute(cmdLong)).rejects.toBeInstanceOf(BookingDurationExceededException);
  });

  it('lanza BookingTooFarInAdvanceException cuando regular reserva con más de 7 días de anticipación', async () => {
    const repo = makeRepo();
    const cmdFar = { ...cmd, inicio: IN_8_DAYS, fin: new Date(IN_8_DAYS.getTime() + 3_600_000) };
    await expect(makeUseCase(repo).execute(cmdFar)).rejects.toBeInstanceOf(BookingTooFarInAdvanceException);
  });

  it('premium con 4 reservas activas puede crear la 5ª', async () => {
    const repo = makeRepo({ countActiveByUser: jest.fn().mockResolvedValue(4) });
    const cmdPremium = { ...cmd, userRole: 'premium' as const, fin: new Date('2024-06-04T13:00:00Z') };
    const result = await makeUseCase(repo).execute(cmdPremium);
    expect(result.estado).toBe('activa');
  });

  it('admin puede crear reserva que violaría cualquier límite de regular', async () => {
    const repo = makeRepo({ countActiveByUser: jest.fn().mockResolvedValue(10), countByUserInMonth: jest.fn().mockResolvedValue(50) });
    const cmdAdmin = { ...cmd, userRole: 'admin' as const, fin: new Date('2024-06-04T22:00:00Z') };
    const result = await makeUseCase(repo).execute(cmdAdmin);
    expect(result.estado).toBe('activa');
  });

  // ── Tests de publicación de eventos (tarea 4.2) ───────────────────────────

  it('publica booking.created con salaId/inicio/fin tras reserva exitosa', async () => {
    const repo = makeRepo();
    const result = await makeUseCase(repo).execute(cmd);

    expect(noopPublisher.publishBookingCreated).toHaveBeenCalledTimes(1);
    expect(noopPublisher.publishBookingCreated).toHaveBeenCalledWith({
      salaId: result.salaId,
      inicio: result.inicio,
      fin: result.fin,
    });
  });

  it('NO publica booking.created si save() lanza excepción (transacción no commitada)', async () => {
    const pgError = Object.assign(new Error('exclusion_violation'), { code: '23P01' });
    const repo = makeRepo({ save: jest.fn().mockRejectedValue(pgError) });

    await expect(makeUseCase(repo).execute(cmd)).rejects.toBeInstanceOf(BookingConflictException);
    expect(noopPublisher.publishBookingCreated).not.toHaveBeenCalled();
  });

  it('NO publica booking.created si hasOverlap lanza excepción (antes de save)', async () => {
    const repo = makeRepo({ hasOverlap: jest.fn().mockResolvedValue(true) });

    await expect(makeUseCase(repo).execute(cmd)).rejects.toBeInstanceOf(BookingConflictException);
    expect(noopPublisher.publishBookingCreated).not.toHaveBeenCalled();
  });
});
