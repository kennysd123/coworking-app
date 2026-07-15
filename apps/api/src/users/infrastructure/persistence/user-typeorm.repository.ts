import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../domain/entities/user.entity';
import type { IUserRepository } from '../../domain/ports/user.repository';
import { UserOrmEntity } from './user.orm-entity';

@Injectable()
export class UserTypeOrmRepository implements IUserRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async save(user: User): Promise<void> {
    await this.dataSource.manager.save(UserOrmEntity, UserTypeOrmRepository.toOrm(user));
  }

  async findByEmail(email: string): Promise<User | null> {
    const orm = await this.dataSource.manager.findOne(UserOrmEntity, {
      where: { email },
    });
    return orm ? UserTypeOrmRepository.toDomain(orm) : null;
  }

  async findById(id: string): Promise<User | null> {
    const orm = await this.dataSource.manager.findOne(UserOrmEntity, {
      where: { id },
    });
    return orm ? UserTypeOrmRepository.toDomain(orm) : null;
  }

  private static toOrm(user: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = user.id;
    orm.email = user.email;
    orm.password_hash = user.passwordHash;
    orm.nombre = user.nombre;
    orm.role = user.role;
    orm.created_at = user.createdAt;
    return orm;
  }

  private static toDomain(orm: UserOrmEntity): User {
    return User.reconstitute({
      id: orm.id,
      email: orm.email,
      passwordHash: orm.password_hash,
      nombre: orm.nombre,
      role: orm.role as UserRole,
      createdAt: orm.created_at,
    });
  }
}
