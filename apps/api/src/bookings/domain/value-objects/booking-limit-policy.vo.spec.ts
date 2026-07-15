import { BookingLimitPolicy } from './booking-limit-policy.vo';

describe('BookingLimitPolicy.for()', () => {
  it('retorna los límites correctos para rol regular', () => {
    const limits = BookingLimitPolicy.for('regular');
    expect(limits.maxActive).toBe(2);
    expect(limits.maxMonthly).toBe(5);
    expect(limits.maxDurationHours).toBe(2);
    expect(limits.maxAdvanceDays).toBe(7);
  });

  it('retorna los límites correctos para rol premium', () => {
    const limits = BookingLimitPolicy.for('premium');
    expect(limits.maxActive).toBe(5);
    expect(limits.maxMonthly).toBe(20);
    expect(limits.maxDurationHours).toBe(4);
    expect(limits.maxAdvanceDays).toBe(30);
  });

  it('admin tiene Infinity en todos los campos (exento de límites)', () => {
    const limits = BookingLimitPolicy.for('admin');
    expect(limits.maxActive).toBe(Infinity);
    expect(limits.maxMonthly).toBe(Infinity);
    expect(limits.maxDurationHours).toBe(Infinity);
    expect(limits.maxAdvanceDays).toBe(Infinity);
  });

  it('los límites de premium son mayores que los de regular en todos los campos', () => {
    const regular = BookingLimitPolicy.for('regular');
    const premium = BookingLimitPolicy.for('premium');
    expect(premium.maxActive).toBeGreaterThan(regular.maxActive);
    expect(premium.maxMonthly).toBeGreaterThan(regular.maxMonthly);
    expect(premium.maxDurationHours).toBeGreaterThan(regular.maxDurationHours);
    expect(premium.maxAdvanceDays).toBeGreaterThan(regular.maxAdvanceDays);
  });

  it('retorna los límites de regular como fallback para un rol desconocido', () => {
    const limits = BookingLimitPolicy.for('unknown' as unknown as import('../../../users/domain/entities/user.entity').UserRole);
    expect(limits).toEqual(BookingLimitPolicy.for('regular'));
  });
});
