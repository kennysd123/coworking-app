export class BookingDurationExceededException extends Error {
  constructor(public readonly maxDurationHours: number) {
    super(`La duración máxima permitida es ${maxDurationHours} hora${maxDurationHours === 1 ? '' : 's'}`);
    this.name = 'BookingDurationExceededException';
    Object.setPrototypeOf(this, BookingDurationExceededException.prototype);
  }
}
