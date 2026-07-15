import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UserRole } from '../../../../users/domain/entities/user.entity';

/**
 * Guard global (registrado como APP_GUARD en AuthModule DESPUÉS de JwtAuthGuard).
 *
 * Depende de que JwtAuthGuard ya haya ejecutado y populado request.user.
 * Si no hay @Roles(), cualquier usuario autenticado puede acceder.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles() → acceso libre para cualquier usuario autenticado
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role: UserRole } }>();

    // Defensivo: si request.user no existe (JwtAuthGuard debería haberlo poblado),
    // denegar acceso en lugar de lanzar un TypeError.
    if (!request.user) return false;

    return requiredRoles.includes(request.user.role);
  }
}
