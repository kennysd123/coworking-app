export class MonthlyBookingLimitExceededException extends Error {
  constructor(public readonly maxMonthly: number) {
    super(`Has alcanzado el límite de ${maxMonthly} reservas por mes`);
    this.name = 'MonthlyBookingLimitExceededException';
    Object.setPrototypeOf(this, MonthlyBookingLimitExceededException.prototype);
  }
}
