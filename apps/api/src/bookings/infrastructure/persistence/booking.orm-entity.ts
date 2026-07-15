import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { BookingEstado } from '../../domain/entities/booking.entity';

@Entity('bookings')
export class BookingOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'sala_id', type: 'varchar' })
  sala_id!: string;

  @Column({ name: 'usuario_id', type: 'varchar' })
  usuario_id!: string;

  @Column({ type: 'timestamptz' })
  inicio!: Date;

  @Column({ type: 'timestamptz' })
  fin!: Date;

  @Column({ type: 'varchar', default: 'activa' })
  estado!: BookingEstado;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}
