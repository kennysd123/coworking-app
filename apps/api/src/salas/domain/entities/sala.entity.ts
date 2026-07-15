export interface CreateSalaParams {
  id: string;
  nombre: string;
  capacidad: number;
  ubicacion: string;
  activa?: boolean;
}

export class Sala {
  private constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly capacidad: number,
    public readonly ubicacion: string,
    public readonly activa: boolean,
  ) {}

  static create(params: CreateSalaParams): Sala {
    return new Sala(
      params.id,
      params.nombre,
      params.capacidad,
      params.ubicacion,
      params.activa ?? true,
    );
  }

  static reconstitute(params: Required<CreateSalaParams>): Sala {
    return new Sala(params.id, params.nombre, params.capacidad, params.ubicacion, params.activa);
  }

  update(partial: Partial<{ nombre: string; capacidad: number; ubicacion: string; activa: boolean }>): Sala {
    return new Sala(
      this.id,
      partial.nombre ?? this.nombre,
      partial.capacidad ?? this.capacidad,
      partial.ubicacion ?? this.ubicacion,
      partial.activa ?? this.activa,
    );
  }
}
