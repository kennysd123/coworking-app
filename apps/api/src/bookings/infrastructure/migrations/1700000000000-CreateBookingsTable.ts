import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsTable1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id          UUID        PRIMARY KEY,
        sala_id     VARCHAR     NOT NULL,
        usuario_id  VARCHAR     NOT NULL,
        inicio      TIMESTAMPTZ NOT NULL,
        fin         TIMESTAMPTZ NOT NULL,
        estado      VARCHAR     NOT NULL DEFAULT 'activa',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS bookings');
  }
}
