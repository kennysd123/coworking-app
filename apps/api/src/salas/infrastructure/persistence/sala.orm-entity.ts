import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('salas')
export class SalaOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ type: 'int' })
  capacidad!: number;

  @Column({ type: 'varchar', length: 255 })
  ubicacion!: string;

  @Column({ type: 'boolean', default: true })
  activa!: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}
