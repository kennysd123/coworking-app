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

describe('GET /bookings/availability (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken: string;
  let userId: string;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-availability';

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
      .send({ email: 'avail@test.com', password: 'Test1234!', nombre: 'Avail', role: 'regular' });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'avail@test.com', password: 'Test1234!' });

    accessToken = (loginRes.body as { access_token: string }).access_token;

    const userRow = await dataSource.query(
      `SELECT id FROM users WHERE email = 'avail@test.com'`,
    ) as Array<{ id: string }>;
    userId = userRow[0].id;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM bookings');
  });

  // helper
  const get = (params: Record<string, string>) =>
    request(app.getHttpServer())
      .get('/bookings/availability')
      .set('Authorization', `Bearer ${accessToken}`)
      .query(params);

  // ── Tests ──────────────────────────────────────────────────────────────────

  it('retorna 401 sin token', async () => {
    await request(app.getHttpServer())
      .get('/bookings/availability')
      .query({ salaId: SALA_A, desde: '2024-06-01T00:00:00Z', hasta: '2024-06-02T00:00:00Z' })
      .expect(401);
  });

  it('retorna 400 cuando faltan parámetros requeridos', async () => {
    await get({ salaId: SALA_A, desde: '2024-06-01T00:00:00Z' }).expect(400);
  });

  it('retorna 400 cuando salaId no es UUID válido', async () => {
    await get({ salaId: 'not-a-uuid', desde: '2024-06-01T00:00:00Z', hasta: '2024-06-02T00:00:00Z' }).expect(400);
  });

  it('retorna slots vacíos cuando no hay reservas en el rango', async () => {
    const res = await get({
      salaId: SALA_A,
      desde: '2024-06-01T00:00:00Z',
      hasta: '2024-06-02T00:00:00Z',
    }).expect(200);

    expect(res.body).toMatchObject({ salaId: SALA_A, slots: [] });
  });

  it('retorna los slots activos en el rango ordenados por inicio', async () => {
    // Insertar dos reservas activas
    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado) VALUES
        (gen_random_uuid(), $1, $2, '2024-06-01T10:00:00Z', '2024-06-01T12:00:00Z', 'activa'),
        (gen_random_uuid(), $1, $2, '2024-06-01T14:00:00Z', '2024-06-01T16:00:00Z', 'activa')`,
      [SALA_A, userId],
    );

    const res = await get({
      salaId: SALA_A,
      desde: '2024-06-01T00:00:00Z',
      hasta: '2024-06-02T00:00:00Z',
    }).expect(200);

    expect(res.body.slots).toHaveLength(2);
    expect(new Date(res.body.slots[0].inicio as string).getUTCHours()).toBe(10);
    expect(new Date(res.body.slots[1].inicio as string).getUTCHours()).toBe(14);
  });

  it('excluye reservas canceladas de la respuesta', async () => {
    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado) VALUES
        (gen_random_uuid(), $1, $2, '2024-06-01T10:00:00Z', '2024-06-01T12:00:00Z', 'cancelada'),
        (gen_random_uuid(), $1, $2, '2024-06-01T14:00:00Z', '2024-06-01T16:00:00Z', 'activa')`,
      [SALA_A, userId],
    );

    const res = await get({
      salaId: SALA_A,
      desde: '2024-06-01T00:00:00Z',
      hasta: '2024-06-02T00:00:00Z',
    }).expect(200);

    expect(res.body.slots).toHaveLength(1);
    expect(new Date(res.body.slots[0].inicio as string).getUTCHours()).toBe(14);
  });

  it('excluye reservas fuera del rango consultado', async () => {
    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado) VALUES
        (gen_random_uuid(), $1, $2, '2024-05-31T10:00:00Z', '2024-05-31T12:00:00Z', 'activa'),
        (gen_random_uuid(), $1, $2, '2024-06-01T10:00:00Z', '2024-06-01T12:00:00Z', 'activa')`,
      [SALA_A, userId],
    );

    const res = await get({
      salaId: SALA_A,
      desde: '2024-06-01T00:00:00Z',
      hasta: '2024-06-02T00:00:00Z',
    }).expect(200);

    expect(res.body.slots).toHaveLength(1);
  });
});
