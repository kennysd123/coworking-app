import 'reflect-metadata';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { BookingsModule } from '../../src/bookings/bookings.module';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { BookingOrmEntity } from '../../src/bookings/infrastructure/persistence/booking.orm-entity';
import { UserOrmEntity } from '../../src/users/infrastructure/persistence/user.orm-entity';
import { CreateBookingsTable1700000000000 } from '../../src/bookings/infrastructure/migrations/1700000000000-CreateBookingsTable';
import { EnableBtreeGist1700000000001 } from '../../src/bookings/infrastructure/migrations/1700000000001-EnableBtreeGist';
import { BookingExclusionConstraint1700000000002 } from '../../src/bookings/infrastructure/migrations/1700000000002-BookingExclusionConstraint';
import { CreateUsersTable1700000001000 } from '../../src/users/infrastructure/migrations/1700000001000-CreateUsersTable';
import { AddBookingsUserIndex1700000002000 } from '../../src/bookings/infrastructure/migrations/1700000002000-AddBookingsUserIndex';

// ─────────────────────────────────────────────────────────────────────────────

const SALA_A = '11111111-1111-4111-a111-111111111111';
const SALA_B = '44444444-4444-4444-b444-444444444444';

// Genera fechas futuras relativas a "ahora" para evitar que los tests caduquen
const future = (days: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

// ─────────────────────────────────────────────────────────────────────────────

describe('Booking Limits (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let dataSource: DataSource;

  let tokenRegular: string;
  let tokenPremium: string;
  let tokenAdmin: string;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-limits';

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('coworking_test')
      .withUsername('coworking')
      .withPassword('coworking')
      .start();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: [BookingOrmEntity, UserOrmEntity],
          migrations: [
            CreateBookingsTable1700000000000,
            EnableBtreeGist1700000000001,
            BookingExclusionConstraint1700000000002,
            CreateUsersTable1700000001000,
            AddBookingsUserIndex1700000002000,
          ],
          migrationsRun: true,
          synchronize: false,
        }),
        UsersModule,
        AuthModule,
        BookingsModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    dataSource = module.get(DataSource);

    // Registrar usuarios de prueba
    for (const [email, role] of [
      ['regular@limits.test', 'regular'],
      ['premium@limits.test', 'premium'],
      ['admin@limits.test', 'regular'], // se promoverá a admin vía SQL
    ]) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'Test1234!', nombre: 'Test', role });
    }

    // Promover admin vía SQL (rol no auto-asignable)
    await dataSource.query(
      `UPDATE users SET role = 'admin' WHERE email = $1`,
      ['admin@limits.test'],
    );

    // Obtener tokens JWT
    const getToken = async (email: string) => {
      const r = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'Test1234!' });
      return (r.body as { access_token: string }).access_token;
    };

    tokenRegular = await getToken('regular@limits.test');
    tokenPremium = await getToken('premium@limits.test');
    tokenAdmin   = await getToken('admin@limits.test');
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM bookings');
  });

  // helpers
  const post = (token: string, body: object) =>
    request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const postFuture = (token: string, daysOffset: number, sala = SALA_A, hour = 10) =>
    post(token, {
      salaId: sala,
      inicio: future(daysOffset, hour),
      fin:    future(daysOffset, hour + 1), // 1h por defecto (dentro de límites)
    });

  // ── 7.7 – Sin token → 401 ─────────────────────────────────────────────────

  it('7.7 POST /bookings sin token → 401', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({ salaId: SALA_A, inicio: future(1), fin: future(1, 11) })
      .expect(401);
  });

  // ── 7.2 – Límite de reservas simultáneas (regular) ────────────────────────

  it('7.2 regular: crea 2 reservas (OK) e intenta la 3ª → 422 por simultáneas', async () => {
    // Crear las 2 reservas permitidas (salas distintas para evitar overlap)
    expect((await postFuture(tokenRegular, 1, SALA_A)).status).toBe(201);
    expect((await postFuture(tokenRegular, 1, SALA_B)).status).toBe(201);

    // La 3ª debe fallar con 422
    const res = await postFuture(tokenRegular, 2, SALA_A);
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ statusCode: 422, error: 'Unprocessable Entity' });
    expect(res.body.message).toMatch(/2/); // mensaje menciona el límite
  });

  // ── 7.3 – Duración máxima ─────────────────────────────────────────────────

  it('7.3a regular: intenta reservar 2h 1min → 422 por duración', async () => {
    const inicio = future(1, 10);
    const fin = new Date(new Date(inicio).getTime() + 121 * 60_000).toISOString();
    const res = await post(tokenRegular, { salaId: SALA_A, inicio, fin });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/2 hora/);
  });

  it('7.3b regular: reserva exactamente 2h → 201', async () => {
    const inicio = future(1, 10);
    const fin = new Date(new Date(inicio).getTime() + 120 * 60_000).toISOString();
    expect((await post(tokenRegular, { salaId: SALA_A, inicio, fin })).status).toBe(201);
  });

  // ── 7.4 – Anticipación máxima ─────────────────────────────────────────────

  it('7.4 regular: intenta reservar para dentro de 8 días → 422 por anticipación', async () => {
    const res = await postFuture(tokenRegular, 8, SALA_A);
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/7 día/);
  });

  // ── 7.5 – Límite simultáneo premium ──────────────────────────────────────

  it('7.5 premium: crea 5 reservas (OK) e intenta la 6ª → 422 por simultáneas', async () => {
    // Pre-insertar 5 reservas activas para el usuario premium directamente
    const premiumId = await dataSource.query(
      `SELECT id FROM users WHERE email = 'premium@limits.test'`,
    ).then((rows: Array<{ id: string }>) => rows[0].id);

    for (let i = 0; i < 5; i++) {
      await dataSource.query(
        `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'activa')`,
        [
          `ffffffff-${String(i).padStart(4, '0')}-4111-a111-111111111111`,
          premiumId,
          future(i + 1, 10),
          future(i + 1, 11),
        ],
      );
    }

    const res = await postFuture(tokenPremium, 6, SALA_A);
    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/5/);
  });

  // ── 7.6 – Admin exento de todos los límites ───────────────────────────────

  it('7.6 admin: puede crear reserva que violaría límites de regular → 201', async () => {
    const adminId = await dataSource.query(
      `SELECT id FROM users WHERE email = 'admin@limits.test'`,
    ).then((rows: Array<{ id: string }>) => rows[0].id);

    // Pre-insertar 3 reservas activas (excedería el límite de regular=2)
    for (let i = 0; i < 3; i++) {
      await dataSource.query(
        `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'activa')`,
        [
          `eeeeeeee-${String(i).padStart(4, '0')}-4111-a111-111111111111`,
          adminId,
          future(i + 1, 10),
          future(i + 1, 11),
        ],
      );
    }

    // Admin puede crear una 4ª (Infinity límite)
    const res = await postFuture(tokenAdmin, 4, SALA_A);
    expect(res.status).toBe(201);
  });

  // ── 7.8 – Concurrencia en límite simultáneo (advisory lock) ──────────────
  //
  // Un usuario regular con 1 reserva activa preexistente dispara 2 POSTs
  // concurrentes hacia DIFERENTES salas/horarios (para no activar anti-overlap).
  // Sin advisory lock, ambas requests verían 1 < 2 y crearían la reserva
  // (usuario quedaría con 3 activas, violando el límite).
  // Con advisory lock (pg_advisory_xact_lock por userId), las transacciones
  // se serializan: la primera ve 1 < 2 y crea, la segunda ve 2 >= 2 y lanza 422.
  // Resultado esperado: exactamente [201, 422].

  it('7.8 [advisory-lock] dos POSTs concurrentes al llegar al límite de simultáneas → exactamente 1×201 y 1×422', async () => {
    const regularId = await dataSource.query(
      `SELECT id FROM users WHERE email = 'regular@limits.test'`,
    ).then((rows: Array<{ id: string }>) => rows[0].id);

    // Pre-insertar 1 reserva activa (el usuario tiene 1 de su límite de 2)
    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'activa')`,
      [SALA_A, regularId, future(5, 10), future(5, 11)],
    );

    // Dos requests simultáneas hacia salas/horarios distintos para evitar overlap
    const [r1, r2] = await Promise.all([
      post(tokenRegular, {
        salaId: SALA_A,
        inicio: future(3, 14),
        fin:    future(3, 15),
      }),
      post(tokenRegular, {
        salaId: SALA_B,
        inicio: future(3, 14),
        fin:    future(3, 15),
      }),
    ]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 422]);

    // Verificar en BD que el usuario quedó con exactamente 2 reservas activas
    const rows = await dataSource.query(
      `SELECT COUNT(*) AS cnt FROM bookings WHERE usuario_id = $1 AND estado = 'activa'`,
      [regularId],
    ) as Array<{ cnt: string }>;
    expect(Number(rows[0].cnt)).toBe(2);
  });
});
