import type { Booking } from '../entities/booking.entity';

export interface OccupiedSlot {
  inicio: Date;
  fin: Date;
}

export interface IBookingRepository {
  /**
   * Retorna true si existe alguna reserva ACTIVA de la misma sala que solape
   * el intervalo [inicio, fin). Cuando se ejecuta dentro de runInTransaction,
   * usa SELECT … FOR UPDATE NOWAIT para bloquear las filas encontradas.
   */
  hasOverlap(
    salaId: string,
    inicio: Date,
    fin: Date,
    excludeId?: string,
  ): Promise<boolean>;

  save(booking: Booking): Promise<void>;

  /**
   * Adquiere un advisory lock transaccional por userId usando
   * pg_advisory_xact_lock(hashtext(userId)).
   * DEBE llamarse desde dentro de runInTransaction para que use el mismo
   * QueryRunner/conexión y el lock sea liberado al hacer commit/rollback.
   */
  acquireUserLock(userId: string): Promise<void>;

  /** Cuenta reservas activas (estado != cancelada, fin > now) del usuario. */
  countActiveByUser(userId: string): Promise<number>;

  /** Cuenta reservas del usuario cuyo inicio cae en el mes (year/month) dado. */
  countByUserInMonth(userId: string, year: number, month: number): Promise<number>;

  /** Retorna los slots ocupados (reservas activas) de la sala en [desde, hasta), ordenados por inicio ASC. */
  findOccupiedSlots(salaId: string, desde: Date, hasta: Date): Promise<OccupiedSlot[]>;

  /** Retorna todas las reservas del usuario (cualquier estado), ordenadas por inicio DESC. */
  findByUser(userId: string): Promise<Booking[]>;

  /** Retorna todas las reservas del sistema, ordenadas por inicio DESC (admin only). */
  findAll(): Promise<Booking[]>;

  /**
   * Ejecuta `fn` dentro de una única transacción de BD.
   * El `txRepo` pasado a `fn` comparte el mismo QueryRunner, garantizando que
   * hasOverlap, acquireUserLock, count* y save sean atómicos.
   */
  runInTransaction<T>(fn: (txRepo: IBookingRepository) => Promise<T>): Promise<T>;
}

export const BOOKING_REPOSITORY = Symbol('IBookingRepository');
