import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Sala } from '../../domain/entities/sala.entity';
import type { ISalaRepository } from '../../domain/ports/sala.repository';
import { SalaOrmEntity } from './sala.orm-entity';

@Injectable()
export class SalaTypeOrmRepository implements ISalaRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async save(sala: Sala): Promise<void> {
    await this.dataSource.manager.save(SalaOrmEntity, SalaTypeOrmRepository.toOrm(sala));
  }

  async findById(id: string): Promise<Sala | null> {
    const orm = await this.dataSource.manager.findOne(SalaOrmEntity, { where: { id } });
    return orm ? SalaTypeOrmRepository.toDomain(orm) : null;
  }

  async findAll(): Promise<Sala[]> {
    const rows = await this.dataSource.manager.find(SalaOrmEntity, {
      order: { nombre: 'ASC' },
    });
    return rows.map(SalaTypeOrmRepository.toDomain);
  }

  async update(sala: Sala): Promise<void> {
    await this.dataSource.manager.save(SalaOrmEntity, SalaTypeOrmRepository.toOrm(sala));
  }

  private static toOrm(sala: Sala): SalaOrmEntity {
    const orm = new SalaOrmEntity();
    orm.id = sala.id;
    orm.nombre = sala.nombre;
    orm.capacidad = sala.capacidad;
    orm.ubicacion = sala.ubicacion;
    orm.activa = sala.activa;
    return orm;
  }

  private static toDomain(orm: SalaOrmEntity): Sala {
    return Sala.reconstitute({
      id: orm.id,
      nombre: orm.nombre,
      capacidad: orm.capacidad,
      ubicacion: orm.ubicacion,
      activa: orm.activa,
    });
  }
}
