import type { ArgumentsHost } from '@nestjs/common';
import { BookingConflictExceptionFilter } from './booking-conflict.exception-filter';
import { BookingConflictException } from '../../../domain/exceptions/booking-conflict.exception';

describe('BookingConflictExceptionFilter', () => {
  let filter: BookingConflictExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    filter = new BookingConflictExceptionFilter();
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

  it('retorna HTTP 409 con el cuerpo estructurado correcto', () => {
    filter.catch(new BookingConflictException(), makeHost());

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'La sala ya está reservada en ese horario',
      error: 'Conflict',
    });
  });
});
