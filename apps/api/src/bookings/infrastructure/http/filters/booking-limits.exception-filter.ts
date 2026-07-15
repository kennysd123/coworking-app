import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { SimultaneousBookingLimitExceededException } from '../../../domain/exceptions/simultaneous-booking-limit-exceeded.exception';
import { MonthlyBookingLimitExceededException } from '../../../domain/exceptions/monthly-booking-limit-exceeded.exception';
import { BookingDurationExceededException } from '../../../domain/exceptions/booking-duration-exceeded.exception';
import { BookingTooFarInAdvanceException } from '../../../domain/exceptions/booking-too-far-in-advance.exception';

type LimitException =
  | SimultaneousBookingLimitExceededException
  | MonthlyBookingLimitExceededException
  | BookingDurationExceededException
  | BookingTooFarInAdvanceException;

@Catch(
  SimultaneousBookingLimitExceededException,
  MonthlyBookingLimitExceededException,
  BookingDurationExceededException,
  BookingTooFarInAdvanceException,
)
export class BookingLimitsExceptionFilter implements ExceptionFilter {
  catch(exception: LimitException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(422).json({
      statusCode: 422,
      message: exception.message,
      error: 'Unprocessable Entity',
    });
  }
}
