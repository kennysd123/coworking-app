import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSalasTable1700000003000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS salas (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre      VARCHAR(255) NOT NULL,
        capacidad   INT         NOT NULL,
        ubicacion   VARCHAR(255) NOT NULL,
        activa      BOOLEAN     NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS salas');
  }
}
