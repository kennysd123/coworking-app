export class EmailAlreadyExistsException extends Error {
  constructor() {
    super('El email ya está registrado');
    this.name = 'EmailAlreadyExistsException';
    Object.setPrototypeOf(this, EmailAlreadyExistsException.prototype);
  }
}
