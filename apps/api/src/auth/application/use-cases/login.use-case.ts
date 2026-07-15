import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { Password } from '../../../users/domain/value-objects/password.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/ports/user.repository';

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult {
  access_token: string;
}

export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    // Ambas ramas usan el mismo error genérico para no revelar si el email existe (OWASP A07)
    const user = await this.userRepo.findByEmail(command.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const valid = await Password.compare(command.password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsException();
    }

    // Incluir nombre en el payload para que GET /auth/me no necesite consultar la BD
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      nombre: user.nombre,
    };
    const access_token = await this.jwtService.signAsync(payload);

    return { access_token };
  }
}
