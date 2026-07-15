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
import { SalasModule } from '../../src/salas/salas.module';
import { BookingOrmEntity } from '../../src/bookings/infrastructure/persistence/booking.orm-entity';
import { UserOrmEntity } from '../../src/users/infrastructure/persistence/user.orm-entity';
import { SalaOrmEntity } from '../../src/salas/infrastructure/persistence/sala.orm-entity';
import { CreateBookingsTable1700000000000 } from '../../src/bookings/infrastructure/migrations/1700000000000-CreateBookingsTable';
import { EnableBtreeGist1700000000001 } from '../../src/bookings/infrastructure/migrations/1700000000001-EnableBtreeGist';
import { BookingExclusionConstraint1700000000002 } from '../../src/bookings/infrastructure/migrations/1700000000002-BookingExclusionConstraint';
import { CreateUsersTable1700000001000 } from '../../src/users/infrastructure/migrations/1700000001000-CreateUsersTable';
import { AddBookingsUserIndex1700000002000 } from '../../src/bookings/infrastructure/migrations/1700000002000-AddBookingsUserIndex';
import { CreateSalasTable1700000003000 } from '../../src/salas/infrastructure/migrations/1700000003000-CreateSalasTable';

// ─────────────────────────────────────────────────────────────────────────────

const SALA_A = '11111111-1111-4111-a111-111111111111';

describe('Bookings – endpoints GET /bookings/me y GET /bookings (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let dataSource: DataSource;

  let tokenRegular: string;
  let tokenAdmin: string;
  let regularUserId: string;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-bookings-list';

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
          entities: [BookingOrmEntity, UserOrmEntity, SalaOrmEntity],
          migrations: [
            CreateBookingsTable1700000000000,
            EnableBtreeGist1700000000001,
            BookingExclusionConstraint1700000000002,
            CreateUsersTable1700000001000,
            AddBookingsUserIndex1700000002000,
            CreateSalasTable1700000003000,
          ],
          migrationsRun: true,
          synchronize: false,
        }),
        UsersModule,
        AuthModule,
        BookingsModule,
        SalasModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
    dataSource = module.get(DataSource);

    // Registrar usuarios
    for (const [email, role] of [
      ['regular@bookings-list.test', 'regular'],
      ['admin@bookings-list.test', 'regular'],
    ]) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'Test1234!', nombre: 'Test', role });
    }
    await dataSource.query(
      `UPDATE users SET role = 'admin' WHERE email = 'admin@bookings-list.test'`,
    );

    const getToken = async (email: string) => {
      const r = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'Test1234!' });
      return (r.body as { access_token: string }).access_token;
    };

    tokenRegular = await getToken('regular@bookings-list.test');
    tokenAdmin = await getToken('admin@bookings-list.test');

    const userRow = await dataSource.query(
      `SELECT id FROM users WHERE email = 'regular@bookings-list.test'`,
    ) as Array<{ id: string }>;
    regularUserId = userRow[0].id;
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM bookings');
  });

  // ── GET /bookings/me ───────────────────────────────────────────────────────

  it('GET /bookings/me devuelve solo las reservas del usuario autenticado', async () => {
    // Insertar 2 reservas del usuario regular y 1 de otro usuario directamente
    const otherUserId = (await dataSource.query(
      `SELECT id FROM users WHERE email = 'admin@bookings-list.test'`,
    ) as Array<{ id: string }>)[0].id;

    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado) VALUES
        (gen_random_uuid(), $1, $2, '2025-06-01T10:00:00Z', '2025-06-01T11:00:00Z', 'activa'),
        (gen_random_uuid(), $1, $2, '2025-06-02T10:00:00Z', '2025-06-02T11:00:00Z', 'activa'),
        (gen_random_uuid(), $1, $3, '2025-06-03T14:00:00Z', '2025-06-03T15:00:00Z', 'activa')`,
      [SALA_A, regularUserId, otherUserId],
    );

    const res = await request(app.getHttpServer())
      .get('/bookings/me')
      .set('Authorization', `Bearer ${tokenRegular}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body.every((b: { salaId: string }) => b.salaId === SALA_A)).toBe(true);
  });

  it('GET /bookings/me retorna 401 sin token', async () => {
    await request(app.getHttpServer()).get('/bookings/me').expect(401);
  });

  // ── GET /bookings ──────────────────────────────────────────────────────────

  it('GET /bookings retorna 403 a usuario con rol regular (no admin)', async () => {
    // Verificación explícita del rechazo de acceso por rol insuficiente
    await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${tokenRegular}`)
      .expect(403);
  });

  it('GET /bookings retorna todas las reservas a admin', async () => {
    const otherUserId = (await dataSource.query(
      `SELECT id FROM users WHERE email = 'admin@bookings-list.test'`,
    ) as Array<{ id: string }>)[0].id;

    await dataSource.query(
      `INSERT INTO bookings (id, sala_id, usuario_id, inicio, fin, estado) VALUES
        (gen_random_uuid(), $1, $2, '2025-07-01T10:00:00Z', '2025-07-01T11:00:00Z', 'activa'),
        (gen_random_uuid(), $1, $3, '2025-07-01T12:00:00Z', '2025-07-01T13:00:00Z', 'activa')`,
      [SALA_A, regularUserId, otherUserId],
    );

    const res = await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    // Verificar que incluye el campo usuarioId (no solo salaId)
    expect(res.body[0]).toHaveProperty('usuarioId');
  });
});
