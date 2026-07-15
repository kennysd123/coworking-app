import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { BookingOrmEntity } from './bookings/infrastructure/persistence/booking.orm-entity';
import { UserOrmEntity } from './users/infrastructure/persistence/user.orm-entity';
import { SalaOrmEntity } from './salas/infrastructure/persistence/sala.orm-entity';
import { CreateBookingsTable1700000000000 } from './bookings/infrastructure/migrations/1700000000000-CreateBookingsTable';
import { EnableBtreeGist1700000000001 } from './bookings/infrastructure/migrations/1700000000001-EnableBtreeGist';
import { BookingExclusionConstraint1700000000002 } from './bookings/infrastructure/migrations/1700000000002-BookingExclusionConstraint';
import { CreateUsersTable1700000001000 } from './users/infrastructure/migrations/1700000001000-CreateUsersTable';
import { AddBookingsUserIndex1700000002000 } from './bookings/infrastructure/migrations/1700000002000-AddBookingsUserIndex';
import { CreateSalasTable1700000003000 } from './salas/infrastructure/migrations/1700000003000-CreateSalasTable';

const _entities = [BookingOrmEntity, UserOrmEntity, SalaOrmEntity];
const _migrations = [
  CreateBookingsTable1700000000000,
  EnableBtreeGist1700000000001,
  BookingExclusionConstraint1700000000002,
  CreateUsersTable1700000001000,
  AddBookingsUserIndex1700000002000,
  CreateSalasTable1700000003000,
];

export default new DataSource(
  process.env.DATABASE_URL
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
        entities: _entities,
        migrations: _migrations,
      }
    : {
        type: 'postgres',
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5433),
        username: process.env.DB_USER ?? 'coworking',
        password: process.env.DB_PASSWORD ?? 'coworking',
        database: process.env.DB_NAME ?? 'coworking_db',
        entities: _entities,
        migrations: _migrations,
      },
);




