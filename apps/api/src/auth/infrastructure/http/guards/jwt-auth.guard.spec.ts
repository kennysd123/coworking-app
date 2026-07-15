import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue(() => {}),
    getClass: jest.fn().mockReturnValue(class {}),
    switchToHttp: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const mockReflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;

  beforeEach(() => {
    guard = new JwtAuthGuard(mockReflector);
    jest.clearAllMocks();
  });

  it('retorna true (bypass) cuando la ruta está anotada con @Public()', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const result = guard.canActivate(makeContext());

    expect(result).toBe(true);
    // Importante: no debe llamar al AuthGuard('jwt') padre
  });

  it('delega a AuthGuard("jwt") cuando la ruta NO es pública', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    // Espiar el método canActivate de la clase padre en la cadena de prototipos
    const superCanActivate = jest
      .spyOn(AuthGuard('jwt').prototype as { canActivate: jest.Mock }, 'canActivate')
      .mockReturnValue(true as never);

    const ctx = makeContext();
    guard.canActivate(ctx);

    expect(superCanActivate).toHaveBeenCalledWith(ctx);
    superCanActivate.mockRestore();
  });

  it('consulta el reflector con IS_PUBLIC_KEY sobre handler y clase', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    const ctx = makeContext();

    guard.canActivate(ctx);

    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
      'isPublic',
      [ctx.getHandler(), ctx.getClass()],
    );
  });
});
