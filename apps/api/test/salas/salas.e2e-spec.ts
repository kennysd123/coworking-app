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

import { SalasModule } from '../../src/salas/salas.module';
import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { BookingsModule } from '../../src/bookings/bookings.module';
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

describe('Salas (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let dataSource: DataSource;

  let tokenAdmin: string;
  let tokenRegular: string;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-salas';

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
      ['regular@salas.test', 'regular'],
      ['admin@salas.test', 'regular'],
    ]) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'Test1234!', nombre: 'Test', role });
    }
    await dataSource.query(
      `UPDATE users SET role = 'admin' WHERE email = 'admin@salas.test'`,
    );

    const getToken = async (email: string) => {
      const r = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'Test1234!' });
      return (r.body as { access_token: string }).access_token;
    };

    tokenRegular = await getToken('regular@salas.test');
    tokenAdmin = await getToken('admin@salas.test');
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM salas');
  });

  // helper
  const createSala = (token: string) =>
    request(app.getHttpServer())
      .post('/salas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Sala Test', capacidad: 10, ubicacion: 'Piso 1' });

  // ── POST /salas ────────────────────────────────────────────────────────────

  it('POST /salas (admin) → 201 con sala creada', async () => {
    const res = await createSala(tokenAdmin).expect(201);
    expect(res.body).toMatchObject({ nombre: 'Sala Test', capacidad: 10, activa: true });
    expect(res.body).toHaveProperty('id');
  });

  it('POST /salas (regular) → 403', async () => {
    await createSala(tokenRegular).expect(403);
  });

  it('POST /salas sin token → 401', async () => {
    await request(app.getHttpServer())
      .post('/salas')
      .send({ nombre: 'X', capacidad: 1, ubicacion: 'Y' })
      .expect(401);
  });

  // ── GET /salas ─────────────────────────────────────────────────────────────

  it('GET /salas (regular autenticado) → 200 con lista', async () => {
    await createSala(tokenAdmin).expect(201);

    const res = await request(app.getHttpServer())
      .get('/salas')
      .set('Authorization', `Bearer ${tokenRegular}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('nombre', 'Sala Test');
  });

  // ── PATCH /salas/:id ───────────────────────────────────────────────────────

  it('PATCH /salas/:id (admin edita sala) → 200 con sala actualizada', async () => {
    const created = await createSala(tokenAdmin).expect(201);
    const salaId = (created.body as { id: string }).id;

    const res = await request(app.getHttpServer())
      .patch(`/salas/${salaId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Sala Editada', capacidad: 20 })
      .expect(200);

    expect(res.body).toMatchObject({ id: salaId, nombre: 'Sala Editada', capacidad: 20 });
  });

  it('PATCH /salas/:id con id inexistente → 404', async () => {
    await request(app.getHttpServer())
      .patch(`/salas/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'X' })
      .expect(404);
  });

  it('PATCH /salas/:id (regular) → 403', async () => {
    const created = await createSala(tokenAdmin).expect(201);
    const salaId = (created.body as { id: string }).id;

    await request(app.getHttpServer())
      .patch(`/salas/${salaId}`)
      .set('Authorization', `Bearer ${tokenRegular}`)
      .send({ nombre: 'X' })
      .expect(403);
  });
});
