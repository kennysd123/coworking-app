import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingOrmEntity } from './infrastructure/persistence/booking.orm-entity';
import { BookingTypeOrmRepository } from './infrastructure/persistence/booking-typeorm.repository';
import { CreateBookingUseCase } from './application/use-cases/create-booking.use-case';
import { GetAvailabilityUseCase } from './application/use-cases/get-availability.use-case';
import { GetMyBookingsUseCase } from './application/use-cases/get-my-bookings.use-case';
import { GetAllBookingsUseCase } from './application/use-cases/get-all-bookings.use-case';
import { BookingsController } from './infrastructure/http/bookings.controller';
import { BookingConflictExceptionFilter } from './infrastructure/http/filters/booking-conflict.exception-filter';
import { BookingLimitsExceptionFilter } from './infrastructure/http/filters/booking-limits.exception-filter';
import { BookingsGateway } from './infrastructure/websocket/bookings.gateway';
import { WsJwtGuard } from './infrastructure/websocket/ws-jwt.guard';
import { BOOKING_REPOSITORY } from './domain/ports/booking.repository';
import { BOOKING_EVENT_PUBLISHER } from './domain/ports/booking-event-publisher.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([BookingOrmEntity]),
    // JwtModule proporciona JwtService a WsJwtGuard para verificar tokens WebSocket
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      }),
    }),
  ],
  controllers: [BookingsController],
  providers: [
    { provide: BOOKING_REPOSITORY, useClass: BookingTypeOrmRepository },
    // BOOKING_EVENT_PUBLISHER → BookingsGateway (misma instancia singleton)
    BookingsGateway,
    { provide: BOOKING_EVENT_PUBLISHER, useExisting: BookingsGateway },
    WsJwtGuard,
    CreateBookingUseCase,
    GetAvailabilityUseCase,
    GetMyBookingsUseCase,
    GetAllBookingsUseCase,
    { provide: APP_FILTER, useClass: BookingConflictExceptionFilter },
    { provide: APP_FILTER, useClass: BookingLimitsExceptionFilter },
  ],
})
export class BookingsModule {}
