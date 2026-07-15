import { BookingDurationExceededException } from './booking-duration-exceeded.exception';

describe('BookingDurationExceededException', () => {
  it('construye el mensaje en plural cuando maxDurationHours > 1', () => {
    const ex = new BookingDurationExceededException(2);
    expect(ex.message).toBe('La duración máxima permitida es 2 horas');
    expect(ex.maxDurationHours).toBe(2);
    expect(ex.name).toBe('BookingDurationExceededException');
  });

  it('construye el mensaje en singular cuando maxDurationHours === 1', () => {
    const ex = new BookingDurationExceededException(1);
    expect(ex.message).toBe('La duración máxima permitida es 1 hora');
    expect(ex.maxDurationHours).toBe(1);
  });

  it('es instancia de Error', () => {
    expect(new BookingDurationExceededException(3)).toBeInstanceOf(Error);
  });
});
