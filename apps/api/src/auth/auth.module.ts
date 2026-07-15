import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { JwtStrategy } from './infrastructure/http/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/http/guards/roles.guard';
import { AuthController } from './infrastructure/http/auth.controller';
import { AuthExceptionFilter } from './infrastructure/http/filters/auth-exception.filter';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '30m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    RegisterUserUseCase,
    LoginUseCase,
    // ── ORDEN CRÍTICO D4 ─────────────────────────────────────────────────────
    // JwtAuthGuard DEBE ir primero: popula request.user desde el JWT.
    // RolesGuard DEBE ir segundo: lee request.user.role (undefined si el orden
    // se invierte → todos los endpoints con @Roles() fallarían con 403).
    { provide: APP_GUARD, useClass: JwtAuthGuard },  // 1º: popula request.user
    { provide: APP_GUARD, useClass: RolesGuard },     // 2º: lee request.user.role
    // ─────────────────────────────────────────────────────────────────────────
    { provide: APP_FILTER, useClass: AuthExceptionFilter },
  ],
})
export class AuthModule {}
