import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User, UserRole } from '../../../users/domain/entities/user.entity';
import { AdminRoleNotAllowedException } from '../../domain/exceptions/admin-role-not-allowed.exception';
import { EmailAlreadyExistsException } from '../../../users/domain/exceptions/email-already-exists.exception';
import { Password } from '../../../users/domain/value-objects/password.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/ports/user.repository';

export interface RegisterUserCommand {
  email: string;
  password: string;
  nombre: string;
  role: 'regular' | 'premium';
}

export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    // Rechazar rol admin (no auto-asignable)
    if ((command.role as string) === 'admin') {
      throw new AdminRoleNotAllowedException();
    }

    // Validar política de contraseña (lanza WeakPasswordException si falla)
    Password.validate(command.password);

    // Verificar unicidad de email
    const existing = await this.userRepo.findByEmail(command.email);
    if (existing) {
      throw new EmailAlreadyExistsException();
    }

    // Hashear contraseña y persistir
    const passwordHash = await Password.hash(command.password);
    const user = User.create({
      id: randomUUID(),
      email: command.email,
      passwordHash,
      nombre: command.nombre,
      role: command.role as UserRole,
    });

    await this.userRepo.save(user);
    return user;
  }
}
