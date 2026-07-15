import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Booking, BookingEstado } from '../../domain/entities/booking.entity';
import { BookingConflictException } from '../../domain/exceptions/booking-conflict.exception';
import type { IBookingRepository, OccupiedSlot } from '../../domain/ports/booking.repository';
import { BookingOrmEntity } from './booking.orm-entity';

@Injectable()
export class BookingTypeOrmRepository implements IBookingRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ─── IBookingRepository (sin transacción, usa manager del DataSource) ────

  async hasOverlap(
    salaId: string,
    inicio: Date,
    fin: Date,
    excludeId?: string,
  ): Promise<boolean> {
    return this.hasOverlapWithManager(
      this.dataSource.manager,
      salaId,
      inicio,
      fin,
      excludeId,
      false,
    );
  }

  async save(booking: Booking): Promise<void> {
    await this.dataSource.manager.save(
      BookingOrmEntity,
      BookingTypeOrmRepository.toOrm(booking),
    );
  }

  // ─── runInTransaction ─────────────────────────────────────────────────────

  // ─── Métodos sin transacción (usan manager del DataSource) ─────────────

  async acquireUserLock(userId: string): Promise<void> {
    // Fuera de transacción el lock se libera al finalizar el statement.
    // En la práctica siempre se llama desde txRepo (dentro de runInTransaction).
    await this.dataSource.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [userId],
    );
  }

  async countActiveByUser(userId: string): Promise<number> {
    const now = new Date();
    return this.dataSource.manager
      .createQueryBuilder(BookingOrmEntity, 'b')
      .where('b.usuario_id = :userId', { userId })
      .andWhere("b.estado != 'cancelada'")
      .andWhere('b.fin > :now', { now })
      .getCount();
  }

  async countByUserInMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month,     1);
    return this.dataSource.manager
      .createQueryBuilder(BookingOrmEntity, 'b')
      .where('b.usuario_id = :userId', { userId })
      .andWhere('b.inicio >= :monthStart', { monthStart })
      .andWhere('b.inicio < :monthEnd', { monthEnd })
      .getCount();
  }

  async findOccupiedSlots(
    salaId: string,
    desde: Date,
    hasta: Date,
  ): Promise<OccupiedSlot[]> {
    const rows = await this.dataSource.manager
      .createQueryBuilder(BookingOrmEntity, 'b')
      .select(['b.inicio', 'b.fin'])
      .where('b.sala_id = :salaId', { salaId })
      .andWhere("b.estado = 'activa'")
      .andWhere('b.inicio < :hasta', { hasta })
      .andWhere('b.fin > :desde', { desde })
      .orderBy('b.inicio', 'ASC')
      .getMany();
    return rows.map((r) => ({ inicio: r.inicio, fin: r.fin }));
  }

  async findByUser(userId: string): Promise<Booking[]> {
    const rows = await this.dataSource.manager
      .createQueryBuilder(BookingOrmEntity, 'b')
      .where('b.usuario_id = :userId', { userId })
      .orderBy('b.inicio', 'DESC')
      .getMany();
    return rows.map(BookingTypeOrmRepository.toDomain);
  }

  async findAll(): Promise<Booking[]> {
    const rows = await this.dataSource.manager
      .createQueryBuilder(BookingOrmEntity, 'b')
      .orderBy('b.inicio', 'DESC')
      .getMany();
    return rows.map(BookingTypeOrmRepository.toDomain);
  }

  // ─── runInTransaction ─────────────────────────────────────────────────────

  async runInTransaction<T>(
    fn: (txRepo: IBookingRepository) => Promise<T>,
  ): Promise<T> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    // txRepo: TODOS los métodos usan qr (mismo QueryRunner/conexión/transacción).
    // CRÍTICO para el advisory lock: qr.query() es la única forma de garantizar
    // que pg_advisory_xact_lock se ejecuta en la misma conexión que el resto
    // de las queries. Un DataSource.query() usaría una conexión distinta del pool.
    const txRepo: IBookingRepository = {
      hasOverlap: (sid, ini, fin, excId) =>
        this.hasOverlapWithManager(qr.manager, sid, ini, fin, excId, true),

      save: async (b) => {
        await qr.manager.save(BookingOrmEntity, BookingTypeOrmRepository.toOrm(b));
      },

      acquireUserLock: async (userId: string) => {
        // qr.query() → misma conexión que hasOverlap y save → lock transaccional
        await qr.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId]);
      },

      countActiveByUser: async (userId: string) => {
        const now = new Date();
        return qr.manager
          .createQueryBuilder(BookingOrmEntity, 'b')
          .where('b.usuario_id = :userId', { userId })
          .andWhere("b.estado != 'cancelada'")
          .andWhere('b.fin > :now', { now })
          .getCount();
      },

      countByUserInMonth: async (userId: string, year: number, month: number) => {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd   = new Date(year, month,     1);
        return qr.manager
          .createQueryBuilder(BookingOrmEntity, 'b')
          .where('b.usuario_id = :userId', { userId })
          .andWhere('b.inicio >= :monthStart', { monthStart })
          .andWhere('b.inicio < :monthEnd', { monthEnd })
          .getCount();
      },

      findOccupiedSlots: async (salaId: string, desde: Date, hasta: Date) => {
        const rows = await qr.manager
          .createQueryBuilder(BookingOrmEntity, 'b')
          .select(['b.inicio', 'b.fin'])
          .where('b.sala_id = :salaId', { salaId })
          .andWhere("b.estado = 'activa'")
          .andWhere('b.inicio < :hasta', { hasta })
          .andWhere('b.fin > :desde', { desde })
          .orderBy('b.inicio', 'ASC')
          .getMany();
        return rows.map((r) => ({ inicio: r.inicio, fin: r.fin }));
      },

      // read-only, no necesitan qr
      findByUser: (userId) => this.findByUser(userId),
      findAll: () => this.findAll(),

      runInTransaction: (innerFn) => innerFn(txRepo), // ya estamos en tx
    };

    try {
      const result = await fn(txRepo);
      await qr.commitTransaction();
      return result;
    } catch (error) {
      await qr.rollbackTransaction();
      throw error;
    } finally {
      await qr.release();
    }
  }

  // ─── helpers privados ─────────────────────────────────────────────────────

  /**
   * 4.1 – Cuando withLock=true (dentro de transacción) usa FOR UPDATE NOWAIT
   * para bloquear filas solapantes existentes.
   * Si PostgreSQL lanza lock_not_available (55P03), otra transacción tiene el
   * lock → lo traducimos a BookingConflictException.
   */
  private async hasOverlapWithManager(
    manager: EntityManager,
    salaId: string,
    inicio: Date,
    fin: Date,
    excludeId: string | undefined,
    withLock: boolean,
  ): Promise<boolean> {
    try {
      const qb = manager
        .createQueryBuilder(BookingOrmEntity, 'b')
        .select(['b.id'])
        .where('b.sala_id = :salaId', { salaId })
        .andWhere("b.estado = 'activa'")
        .andWhere('b.inicio < :fin', { fin })
        .andWhere(':inicio < b.fin', { inicio });

      if (excludeId) {
        qb.andWhere('b.id != :excludeId', { excludeId });
      }

      if (withLock) {
        qb.setLock('pessimistic_write_or_fail'); // → FOR UPDATE NOWAIT
      }

      const rows = await qb.getMany();
      return rows.length > 0;
    } catch (error: unknown) {
      // 55P03 = lock_not_available: otra tx retiene el lock → conflicto seguro
      if (isLockUnavailable(error)) {
        throw new BookingConflictException();
      }
      throw error;
    }
  }

  private static toOrm(booking: Booking): BookingOrmEntity {
    const orm = new BookingOrmEntity();
    orm.id = booking.id;
    orm.sala_id = booking.salaId;
    orm.usuario_id = booking.usuarioId;
    orm.inicio = booking.inicio;
    orm.fin = booking.fin;
    orm.estado = booking.estado;
    return orm;
  }

  private static toDomain(orm: BookingOrmEntity): Booking {
    return Booking.reconstitute({
      id: orm.id,
      salaId: orm.sala_id,
      usuarioId: orm.usuario_id,
      inicio: orm.inicio,
      fin: orm.fin,
      estado: orm.estado as BookingEstado,
    });
  }
}

function isLockUnavailable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '55P03'
  );
}
