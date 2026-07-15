export class InvalidCredentialsException extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsException';
    Object.setPrototypeOf(this, InvalidCredentialsException.prototype);
  }
}
