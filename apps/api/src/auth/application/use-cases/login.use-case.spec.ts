import { LoginUseCase } from './login.use-case';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { Password } from '../../../users/domain/value-objects/password.vo';
import type { IUserRepository } from '../../../users/domain/ports/user.repository';
import { User } from '../../../users/domain/entities/user.entity';

const mockUser = User.reconstitute({
  id: 'user-id',
  email: 'ana@example.com',
  passwordHash: 'hash',
  nombre: 'Ana',
  role: 'regular',
  createdAt: new Date(),
});

function makeRepo(
  overrides: Partial<Record<keyof IUserRepository, jest.Mock>> = {},
): jest.Mocked<IUserRepository> {
  return {
    save: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(mockUser),
    findById: jest.fn().mockResolvedValue(mockUser),
    ...overrides,
  } as jest.Mocked<IUserRepository>;
}

const mockJwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

const cmd = { email: 'ana@example.com', password: 'Segura1!' };

describe('LoginUseCase', () => {
  beforeEach(() => {
    jest.spyOn(Password, 'compare').mockResolvedValue(true);
    mockJwtService.signAsync.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('retorna access_token cuando las credenciales son correctas', async () => {
    const repo = makeRepo();
    const result = await new LoginUseCase(repo, mockJwtService as never).execute(cmd);

    expect(result.access_token).toBe('signed.jwt.token');
    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: mockUser.id, email: mockUser.email, role: mockUser.role }),
    );
  });

  it('el payload del JWT incluye nombre para que GET /auth/me no necesite consultar la BD', async () => {
    const repo = makeRepo();
    await new LoginUseCase(repo, mockJwtService as never).execute(cmd);

    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: mockUser.nombre }),
    );
  });

  it('lanza InvalidCredentialsException cuando el email no existe (mismo error genérico)', async () => {
    const repo = makeRepo({ findByEmail: jest.fn().mockResolvedValue(null) });

    await expect(
      new LoginUseCase(repo, mockJwtService as never).execute(cmd),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });

  it('lanza InvalidCredentialsException cuando el password es incorrecto (mismo error genérico)', async () => {
    jest.spyOn(Password, 'compare').mockResolvedValue(false);
    const repo = makeRepo();

    await expect(
      new LoginUseCase(repo, mockJwtService as never).execute(cmd),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(mockJwtService.signAsync).not.toHaveBeenCalled();
  });
});
