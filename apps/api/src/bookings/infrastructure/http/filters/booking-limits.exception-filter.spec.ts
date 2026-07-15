import type { ArgumentsHost } from '@nestjs/common';
import { BookingLimitsExceptionFilter } from './booking-limits.exception-filter';
import { SimultaneousBookingLimitExceededException } from '../../../domain/exceptions/simultaneous-booking-limit-exceeded.exception';
import { MonthlyBookingLimitExceededException } from '../../../domain/exceptions/monthly-booking-limit-exceeded.exception';
import { BookingDurationExceededException } from '../../../domain/exceptions/booking-duration-exceeded.exception';
import { BookingTooFarInAdvanceException } from '../../../domain/exceptions/booking-too-far-in-advance.exception';

describe('BookingLimitsExceptionFilter', () => {
  let filter: BookingLimitsExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    filter = new BookingLimitsExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  });

  const makeHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: jest.fn(),
        getNext: jest.fn(),
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    }) as unknown as ArgumentsHost;

  it.each([
    new SimultaneousBookingLimitExceededException(2),
    new MonthlyBookingLimitExceededException(5),
    new BookingDurationExceededException(2),
    new BookingTooFarInAdvanceException(7),
  ])('retorna HTTP 422 para %s', (exception) => {
    filter.catch(exception as never, makeHost());

    expect(mockStatus).toHaveBeenCalledWith(422);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 422, error: 'Unprocessable Entity' }),
    );
  });
});
