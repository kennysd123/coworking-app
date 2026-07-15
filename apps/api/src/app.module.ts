import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsModule } from './bookings/bookings.module';
import { BookingOrmEntity } from './bookings/infrastructure/persistence/booking.orm-entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserOrmEntity } from './users/infrastructure/persistence/user.orm-entity';
import { SalasModule } from './salas/salas.module';
import { SalaOrmEntity } from './salas/infrastructure/persistence/sala.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5433),
      username: process.env.DB_USER ?? 'coworking',
      password: process.env.DB_PASSWORD ?? 'coworking',
      database: process.env.DB_NAME ?? 'coworking_db',
      entities: [BookingOrmEntity, UserOrmEntity, SalaOrmEntity],
      migrations: [
        'dist/bookings/infrastructure/migrations/*.js',
        'dist/users/infrastructure/migrations/*.js',
        'dist/salas/infrastructure/migrations/*.js',
      ],
      migrationsRun: false,
      synchronize: false,
    }),
    UsersModule,
    AuthModule,
    BookingsModule,
    SalasModule,
  ],
})
export class AppModule {}
