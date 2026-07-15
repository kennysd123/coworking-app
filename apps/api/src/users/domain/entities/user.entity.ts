export type UserRole = 'regular' | 'premium' | 'admin';

export interface CreateUserParams {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  role: UserRole;
}

export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly nombre: string,
    public readonly role: UserRole,
    public readonly createdAt: Date,
  ) {}

  static create(params: CreateUserParams): User {
    return new User(
      params.id,
      params.email,
      params.passwordHash,
      params.nombre,
      params.role,
      new Date(),
    );
  }

  static reconstitute(params: CreateUserParams & { createdAt: Date }): User {
    return new User(
      params.id,
      params.email,
      params.passwordHash,
      params.nombre,
      params.role,
      params.createdAt,
    );
  }
}
