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

// SALA_A: UUID v4 válido para los tests de overlap (sin FK real)
const SALA_A = '11111111-1111-4111-a111-111111111111';

// USER_1 / USER_2: solo se usan en INSERTs SQL directos (bypass app)
const USER_1 = '22222222-2222-4222-a222-222222222222';
const USER_2 = '33333333-3333-4333-a333-333333333333';

// ─────────────────────────────────────────────────────────────────────────────

describe('Booking Concurrency (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string; // JWT del usuario de test

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-concurrency';

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

    // Registrar usuario de test y obtener JWT
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'concurrency@test.com', password: 'Test1234!', nombre: 'Test', role: 'regular' });
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'concurrency@test.com', password: 'Test1234!' });
    accessToken = (loginRes.body as { access_token: string }).access_token;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM bookings');
  });

  // helper
  const post = (body: object) =>
    request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(body);

  // ── 7.2a – Path 1: FOR UPDATE NOWAIT detecta reserva existente ────────────

  it('7.2a [path-1/FOR-UPDATE] rechaza reserva solapante cuando ya existe una activa', async () => {
    expect(
      (await post({ salaId: SALA_A, inicio: '2024-06-01T10:00:00Z', fin: '2024-06-01T12:00:00Z' })).status,
    ).toBe(201);

    const res = await post({
      salaId: SALA_A,
      inicio: '2024-06-01T10:00:00Z',
      fin: '2024-06-01T12:00:00Z',
    });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ statusCode: 409, error: 'Conflict' });
  });

  // ── 7.2b – Path 2: EXCLUDE constraint captura INSERTs concurrentes ─────────

  it('7.2b [path-2/EXCLUDE-constraint] INSERT directo viola constraint exclusion_violation (23P01)', async () => {
    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'activa')`,
      [SALA_A, USER_1, '2024-06-02T14:00:00Z', '2024-06-02T16:00:00Z'],
    );

    await expect(
      dataSource.query(
        `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'activa')`,
        [SALA_A, USER_2, '2024-06-02T15:00:00Z', '2024-06-02T17:00:00Z'],
      ),
    ).rejects.toMatchObject({ code: '23P01' });
  });

  it('7.2b [path-2/concurrent-HTTP] dos POST concurrentes sobre slot vacío → exactamente un 201 y un 409', async () => {
    const payload = { salaId: SALA_A, inicio: '2024-06-03T09:00:00Z', fin: '2024-06-03T11:00:00Z' };

    const [r1, r2] = await Promise.all([
      post(payload),
      post(payload),
    ]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
  });

  // ── 7.3 – Slot de reserva cancelada es reservable ─────────────────────────

  it('7.3 permite reservar el slot de una reserva cancelada (índice parcial WHERE estado != cancelada)', async () => {
    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'cancelada')`,
      [SALA_A, USER_1, '2024-06-04T10:00:00Z', '2024-06-04T12:00:00Z'],
    );

    expect(
      (await post({ salaId: SALA_A, inicio: '2024-06-04T10:00:00Z', fin: '2024-06-04T12:00:00Z' })).status,
    ).toBe(201);
  });

  // ── 7.4 – Reservas contiguas no solapan ───────────────────────────────────

  it('7.4 permite dos reservas contiguas (fin == inicio) en la misma sala', async () => {
    const [r1, r2] = await Promise.all([
      post({ salaId: SALA_A, inicio: '2024-06-05T10:00:00Z', fin: '2024-06-05T12:00:00Z' }),
      post({ salaId: SALA_A, inicio: '2024-06-05T12:00:00Z', fin: '2024-06-05T14:00:00Z' }),
    ]);

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
  });
});
