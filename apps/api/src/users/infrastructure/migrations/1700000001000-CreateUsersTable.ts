import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1700000001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        nombre        VARCHAR(255) NOT NULL,
        role          VARCHAR(20)  NOT NULL DEFAULT 'regular',
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 5.4 – reversible: elimina la tabla sin afectar bookings
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
