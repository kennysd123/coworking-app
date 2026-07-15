import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 5.1 – Activa btree_gist, requerido para incluir tipos btree-compatibles
 * (varchar) en índices GiST usados por la constraint EXCLUDE.
 */
export class EnableBtreeGist1700000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 5.3 – reversible: elimina la extensión solo si no hay otras dependencias
    await queryRunner.query('DROP EXTENSION IF EXISTS btree_gist');
  }
}
