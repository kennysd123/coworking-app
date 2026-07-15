import type { UserRole } from '../../../users/domain/entities/user.entity';

export interface BookingLimits {
  maxActive: number;
  maxMonthly: number;
  maxDurationHours: number;
  maxAdvanceDays: number;
}

const LIMITS: Record<UserRole, BookingLimits> = {
  regular: { maxActive: 2,        maxMonthly: 5,        maxDurationHours: 2,        maxAdvanceDays: 7  },
  premium: { maxActive: 5,        maxMonthly: 20,       maxDurationHours: 4,        maxAdvanceDays: 30 },
  admin:   { maxActive: Infinity, maxMonthly: Infinity, maxDurationHours: Infinity, maxAdvanceDays: Infinity },
};

export class BookingLimitPolicy {
  static for(role: UserRole): BookingLimits {
    return LIMITS[role] ?? LIMITS.regular;
  }
}
