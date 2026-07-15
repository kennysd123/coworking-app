export class WeakPasswordException extends Error {
  constructor(reason: string) {
    super(`Contraseña inválida: ${reason}`);
    this.name = 'WeakPasswordException';
    Object.setPrototypeOf(this, WeakPasswordException.prototype);
  }
}
