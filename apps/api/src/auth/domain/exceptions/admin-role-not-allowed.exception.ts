export class AdminRoleNotAllowedException extends Error {
  constructor() {
    super('El rol "admin" no puede auto-asignarse en el registro');
    this.name = 'AdminRoleNotAllowedException';
    Object.setPrototypeOf(this, AdminRoleNotAllowedException.prototype);
  }
}
