import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { BookingConflictException } from '../../../domain/exceptions/booking-conflict.exception';

/**
 * 6.1 – Captura BookingConflictException y retorna HTTP 409.
 * Registrado en BookingsModule via APP_FILTER (tarea 6.2).
 */
@Catch(BookingConflictException)
export class BookingConflictExceptionFilter implements ExceptionFilter {
  catch(exception: BookingConflictException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(409).json({
      statusCode: 409,
      message: exception.message,
      error: 'Conflict',
    });
  }
}
