import { Booking } from './booking.entity';

const make = (salaId: string, inicio: Date, fin: Date) =>
  Booking.create({ id: 'x', salaId, usuarioId: 'u', inicio, fin });

const A = 'sala-a';
const B = 'sala-b';

describe('Booking.overlaps', () => {
  it('solapamiento total: a engloba a b', () => {
    const a = make(A, new Date('2024-01-01T09:00Z'), new Date('2024-01-01T13:00Z'));
    const b = make(A, new Date('2024-01-01T10:00Z'), new Date('2024-01-01T12:00Z'));
    expect(Booking.overlaps(a, b)).toBe(true);
  });

  it('solapamiento parcial al inicio de la nueva reserva', () => {
    const a = make(A, new Date('2024-01-01T11:00Z'), new Date('2024-01-01T13:00Z'));
    const b = make(A, new Date('2024-01-01T10:00Z'), new Date('2024-01-01T12:00Z'));
    expect(Booking.overlaps(a, b)).toBe(true);
  });

  it('solapamiento parcial al final de la nueva reserva', () => {
    const a = make(A, new Date('2024-01-01T09:00Z'), new Date('2024-01-01T11:00Z'));
    const b = make(A, new Date('2024-01-01T10:00Z'), new Date('2024-01-01T12:00Z'));
    expect(Booking.overlaps(a, b)).toBe(true);
  });

  it('reservas contiguas (fin == inicio) no solapan', () => {
    const a = make(A, new Date('2024-01-01T10:00Z'), new Date('2024-01-01T12:00Z'));
    const b = make(A, new Date('2024-01-01T12:00Z'), new Date('2024-01-01T14:00Z'));
    expect(Booking.overlaps(a, b)).toBe(false);
  });

  it('distinto horario sin solapamiento', () => {
    const a = make(A, new Date('2024-01-01T14:00Z'), new Date('2024-01-01T16:00Z'));
    const b = make(A, new Date('2024-01-01T10:00Z'), new Date('2024-01-01T12:00Z'));
    expect(Booking.overlaps(a, b)).toBe(false);
  });

  it('misma hora pero distinta sala no solapan', () => {
    const a = make(B, new Date('2024-01-01T10:00Z'), new Date('2024-01-01T12:00Z'));
    const b = make(A, new Date('2024-01-01T10:00Z'), new Date('2024-01-01T12:00Z'));
    expect(Booking.overlaps(a, b)).toBe(false);
  });
});

describe('Booking.reconstitute', () => {
  it('reconstituye una reserva con estado cancelada', () => {
    const booking = Booking.reconstitute({
      id: 'b1',
      salaId: 'sala-a',
      usuarioId: 'u1',
      inicio: new Date('2024-01-01T10:00Z'),
      fin: new Date('2024-01-01T12:00Z'),
      estado: 'cancelada',
    });
    expect(booking.estado).toBe('cancelada');
    expect(booking.id).toBe('b1');
  });

  it('reconstituye una reserva con estado activa', () => {
    const booking = Booking.reconstitute({
      id: 'b2',
      salaId: 'sala-b',
      usuarioId: 'u2',
      inicio: new Date('2024-01-02T09:00Z'),
      fin: new Date('2024-01-02T11:00Z'),
      estado: 'activa',
    });
    expect(booking.estado).toBe('activa');
  });
});
