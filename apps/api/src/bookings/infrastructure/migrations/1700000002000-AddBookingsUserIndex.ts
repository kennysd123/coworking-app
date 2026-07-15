import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 4.3 – Índice en (usuario_id, inicio) para optimizar countActiveByUser
 * y countByUserInMonth sin cambiar el esquema de la tabla.
 */
export class AddBookingsUserIndex1700000002000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_bookings_usuario_inicio ON bookings (usuario_id, inicio)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 4.4 – reversible: solo elimina el índice, sin afectar datos
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_bookings_usuario_inicio',
    );
  }
}
