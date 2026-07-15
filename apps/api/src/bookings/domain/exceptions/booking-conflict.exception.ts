export class BookingConflictException extends Error {
  constructor() {
    super('La sala ya está reservada en ese horario');
    this.name = 'BookingConflictException';
    Object.setPrototypeOf(this, BookingConflictException.prototype);
  }
}
