export type BookingEstado = 'activa' | 'cancelada';

export interface CreateBookingParams {
  id: string;
  salaId: string;
  usuarioId: string;
  inicio: Date;
  fin: Date;
}

export class Booking {
  private constructor(
    public readonly id: string,
    public readonly salaId: string,
    public readonly usuarioId: string,
    public readonly inicio: Date,
    public readonly fin: Date,
    public readonly estado: BookingEstado,
  ) {}

  static create(params: CreateBookingParams): Booking {
    return new Booking(
      params.id,
      params.salaId,
      params.usuarioId,
      params.inicio,
      params.fin,
      'activa',
    );
  }

  static reconstitute(
    params: CreateBookingParams & { estado: BookingEstado },
  ): Booking {
    return new Booking(
      params.id,
      params.salaId,
      params.usuarioId,
      params.inicio,
      params.fin,
      params.estado,
    );
  }

  /**
   * Retorna true si dos reservas de la MISMA sala se solapan.
   * Usa intervalos semiabiertos [inicio, fin): dos intervalos se solapan cuando
   * a.inicio < b.fin AND b.inicio < a.fin.
   */
  static overlaps(a: Booking, b: Booking): boolean {
    if (a.salaId !== b.salaId) return false;
    return a.inicio < b.fin && b.inicio < a.fin;
  }
}
