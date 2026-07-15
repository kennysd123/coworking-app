import { RegisterUserUseCase } from './register-user.use-case';
import { AdminRoleNotAllowedException } from '../../domain/exceptions/admin-role-not-allowed.exception';
import { EmailAlreadyExistsException } from '../../../users/domain/exceptions/email-already-exists.exception';
import { WeakPasswordException } from '../../../users/domain/exceptions/weak-password.exception';
import { Password } from '../../../users/domain/value-objects/password.vo';
import type { IUserRepository } from '../../../users/domain/ports/user.repository';

function makeRepo(
  overrides: Partial<Record<keyof IUserRepository, jest.Mock>> = {},
): jest.Mocked<IUserRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as jest.Mocked<IUserRepository>;
}

const validCmd = {
  email: 'ana@example.com',
  password: 'Segura1!',
  nombre: 'Ana',
  role: 'regular' as const,
};

describe('RegisterUserUseCase', () => {
  beforeEach(() => {
    jest.spyOn(Password, 'hash').mockResolvedValue('hashed_pw');
  });
  afterEach(() => jest.restoreAllMocks());

  it('registra al usuario correctamente y retorna User sin password en texto plano', async () => {
    const repo = makeRepo();
    const result = await new RegisterUserUseCase(repo).execute(validCmd);

    expect(result.email).toBe(validCmd.email);
    expect(result.nombre).toBe(validCmd.nombre);
    expect(result.role).toBe('regular');
    expect(result.passwordHash).toBe('hashed_pw');
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ email: validCmd.email }));
  });

  it('lanza EmailAlreadyExistsException cuando el email ya existe', async () => {
    const repo = makeRepo({
      findByEmail: jest.fn().mockResolvedValue({ id: 'x' }),
    });

    await expect(new RegisterUserUseCase(repo).execute(validCmd)).rejects.toBeInstanceOf(
      EmailAlreadyExistsException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lanza AdminRoleNotAllowedException cuando se intenta registrar con rol admin', async () => {
    const repo = makeRepo();

    await expect(
      new RegisterUserUseCase(repo).execute({ ...validCmd, role: 'admin' as never }),
    ).rejects.toBeInstanceOf(AdminRoleNotAllowedException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lanza WeakPasswordException cuando el password no cumple la política', async () => {
    jest.restoreAllMocks(); // usar Password.validate real
    const repo = makeRepo();

    await expect(
      new RegisterUserUseCase(repo).execute({ ...validCmd, password: 'debil' }),
    ).rejects.toBeInstanceOf(WeakPasswordException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
