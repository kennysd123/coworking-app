export class SalaNotFoundException extends Error {
  constructor(public readonly salaId: string) {
    super(`Sala con id "${salaId}" no encontrada`);
    this.name = 'SalaNotFoundException';
    Object.setPrototypeOf(this, SalaNotFoundException.prototype);
  }
}
