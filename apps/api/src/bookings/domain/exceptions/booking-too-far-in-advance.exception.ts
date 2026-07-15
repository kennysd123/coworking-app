export class BookingTooFarInAdvanceException extends Error {
  constructor(public readonly maxAdvanceDays: number) {
    super(`Solo puedes reservar con un máximo de ${maxAdvanceDays} días de anticipación`);
    this.name = 'BookingTooFarInAdvanceException';
    Object.setPrototypeOf(this, BookingTooFarInAdvanceException.prototype);
  }
}
