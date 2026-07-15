import 'reflect-metadata';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Test, type TestingModule } from '@nestjs/testing';
import { Controller, Get, INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { BookingOrmEntity } from '../../src/bookings/infrastructure/persistence/booking.orm-entity';
import { UserOrmEntity } from '../../src/users/infrastructure/persistence/user.orm-entity';
import { CreateBookingsTable1700000000000 } from '../../src/bookings/infrastructure/migrations/1700000000000-CreateBookingsTable';
import { EnableBtreeGist1700000000001 } from '../../src/bookings/infrastructure/migrations/1700000000001-EnableBtreeGist';
import { BookingExclusionConstraint1700000000002 } from '../../src/bookings/infrastructure/migrations/1700000000002-BookingExclusionConstraint';
import { CreateUsersTable1700000001000 } from '../../src/users/infrastructure/migrations/1700000001000-CreateUsersTable';
import { Roles } from '../../src/auth/infrastructure/http/decorators/roles.decorator';

// ─── Endpoint temporal solo para probar RolesGuard ────────────────────────────
// No existe en producción. Aislado en este módulo de test.
// Comprueba que un token con rol 'regular' recibe 403 en una ruta @Roles('admin').
@Controller('test')
class TestRolesController {
  @Get('admin-only')
  @Roles('admin')
  adminOnly() {
    return { ok: true };
  }
}
// ─────────────────────────────────────────────────────────────────────────────

describe('Auth (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let dataSource: DataSource;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
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
          ],
          migrationsRun: true,
          synchronize: false,
        }),
        UsersModule,
        AuthModule,
      ],
      // TestRolesController se registra SOLO en este módulo de test; nunca en producción.
      controllers: [TestRolesController],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    dataSource = module.get(DataSource);
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM users');
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function registerUser(overrides: object = {}) {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'ana@example.com',
        password: 'Segura1!',
        nombre: 'Ana',
        role: 'regular',
        ...overrides,
      });
  }

  async function loginUser(email = 'ana@example.com', password = 'Segura1!') {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });
  }

  // ── 9.2 – Registro exitoso y email único ──────────────────────────────────

  it('9.2a POST /auth/register → 201, cuerpo sin password', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'ana@example.com', role: 'regular' });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('9.2b POST /auth/register con email duplicado → 409', async () => {
    expect((await registerUser()).status).toBe(201);
    const res = await registerUser();

    expect(res.status).toBe(409);
  });

  // ── 9.3 – Rol admin rechazado ─────────────────────────────────────────────

  it('9.3 POST /auth/register con rol admin → 400', async () => {
    const res = await registerUser({ role: 'admin' });

    expect(res.status).toBe(400);
  });

  // ── 9.4 – Login exitoso ───────────────────────────────────────────────────

  it('9.4 POST /auth/login exitoso → 200 con access_token', async () => {
    expect((await registerUser()).status).toBe(201);
    const res = await loginUser();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(typeof res.body.access_token).toBe('string');
  });

  // ── 9.5 – Credenciales inválidas ──────────────────────────────────────────

  it('9.5a POST /auth/login con email inexistente → 401 mensaje genérico', async () => {
    const res = await loginUser('noexiste@example.com', 'Segura1!');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('9.5b POST /auth/login con password incorrecto → mismo 401 genérico (no revela existencia del email)', async () => {
    expect((await registerUser()).status).toBe(201);
    const res = await loginUser('ana@example.com', 'Incorrecta1!');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  // ── 9.6 – GET /auth/me + RolesGuard ──────────────────────────────────────

  it('9.6a GET /auth/me sin token → 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('9.6b GET /auth/me con token válido → 200 con datos del usuario (sin password)', async () => {
    expect((await registerUser()).status).toBe(201);
    const loginRes = await loginUser();
    expect(loginRes.status).toBe(200);
    const { access_token } = loginRes.body as { access_token: string };

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'ana@example.com', role: 'regular', nombre: 'Ana' });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('9.6c RolesGuard: token con rol regular rechazado en ruta @Roles("admin") → 403', async () => {
    // El token tiene rol 'regular'; el endpoint /test/admin-only requiere 'admin'.
    // Verifica que RolesGuard (2º APP_GUARD) evalúa el rol correctamente
    // después de que JwtAuthGuard (1º APP_GUARD) ha populado request.user.
    expect((await registerUser()).status).toBe(201);
    const loginRes = await loginUser();
    expect(loginRes.status).toBe(200);
    const { access_token } = loginRes.body as { access_token: string };

    const res = await request(app.getHttpServer())
      .get('/test/admin-only')
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(403);
  });

  it('9.6d RolesGuard: token con rol admin accede a ruta @Roles("admin") → 200', async () => {
    // Registrar como 'regular' y luego promover a 'admin' via SQL (simula seed/proceso manual)
    expect(
      (await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'admin@example.com', password: 'Admin1234!', nombre: 'Admin', role: 'regular' })).status,
    ).toBe(201);
    await dataSource.query(`UPDATE users SET role = 'admin' WHERE email = $1`, ['admin@example.com']);

    const loginRes2 = await loginUser('admin@example.com', 'Admin1234!');
    expect(loginRes2.status).toBe(200);
    const { access_token } = loginRes2.body as { access_token: string };

    const res = await request(app.getHttpServer())
      .get('/test/admin-only')
      .set('Authorization', `Bearer ${access_token}`);

    expect(res.status).toBe(200);
  });
});
