import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 5.2 – Añade la constraint de exclusión anti-overbooking.
 *
 * Usa tstzrange (timestamp with time zone range) porque las columnas inicio/fin
 * son TIMESTAMPTZ. El índice parcial WHERE (estado != 'cancelada') garantiza
 * que las reservas canceladas no bloqueen el slot.
 *
 * Requiere la extensión btree_gist (migración 1700000000001) para poder incluir
 * sala_id (varchar) en el índice GiST junto con el rango tstzrange.
 */
export class BookingExclusionConstraint1700000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bookings
      ADD CONSTRAINT booking_no_overlap
      EXCLUDE USING gist (
        sala_id          WITH =,
        tstzrange(inicio, fin, '[)') WITH &&
      ) WHERE (estado != 'cancelada')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 5.3 – reversible: elimina la constraint sin afectar datos
    await queryRunner.query(
      'ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_no_overlap',
    );
  }
}
