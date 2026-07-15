import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface WsJwtPayload {
  sub: string;
  email: string;
  role: string;
  nombre: string;
}

/**
 * Clase de servicio que encapsula la verificación de JWT para WebSocket.
 *
 * NO implementa CanActivate ni se usa como @UseGuards() decorator:
 * los guards de NestJS no se ejecutan sobre el lifecycle hook handleConnection
 * (Socket.IO lo invoca fuera de la cadena de ejecución de NestJS).
 *
 * Se invoca manualmente desde el middleware de Socket.IO registrado en
 * BookingsGateway.afterInit() vía server.use().
 */
@Injectable()
export class WsJwtGuard {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Verifica el token JWT y retorna el payload.
   * Lanza si el token es inválido o ha expirado.
   */
  verifyToken(token: string): WsJwtPayload {
    return this.jwtService.verify<WsJwtPayload>(token);
  }
}
