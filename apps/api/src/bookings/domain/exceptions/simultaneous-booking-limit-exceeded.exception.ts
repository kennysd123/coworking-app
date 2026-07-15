export class SimultaneousBookingLimitExceededException extends Error {
  constructor(public readonly maxActive: number) {
    super(`Has alcanzado el límite de ${maxActive} reservas activas simultáneas`);
    this.name = 'SimultaneousBookingLimitExceededException';
    Object.setPrototypeOf(this, SimultaneousBookingLimitExceededException.prototype);
  }
}
