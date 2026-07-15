import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function makeContext(userRole: string | undefined, roles: string[] | undefined): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(() => {}),
    getClass: jest.fn().mockReturnValue(class {}),
    switchToHttp: () => ({
      getRequest: () => (userRole !== undefined ? { user: { role: userRole } } : {}),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const mockReflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;

  beforeEach(() => {
    guard = new RolesGuard(mockReflector);
  });

  it('permite acceso cuando el usuario tiene el rol requerido', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    expect(guard.canActivate(makeContext('admin', ['admin']))).toBe(true);
  });

  it('rechaza (false) cuando el rol del usuario no está en los roles requeridos', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    expect(guard.canActivate(makeContext('regular', ['admin']))).toBe(false);
  });

  it('permite acceso cuando no hay @Roles() declarado (undefined)', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(makeContext('regular', undefined))).toBe(true);
  });

  it('permite acceso cuando @Roles() está vacío ([])', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue([]);
    expect(guard.canActivate(makeContext('regular', []))).toBe(true);
  });

  it('retorna false (sin lanzar TypeError) cuando request.user es undefined', () => {
    // Caso defensivo: JwtAuthGuard no pobló request.user por alguna razón
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    expect(guard.canActivate(makeContext(undefined, ['admin']))).toBe(false);
  });
});
