import { Sala } from './sala.entity';

describe('Sala.create', () => {
  it('crea una sala con activa=true por defecto cuando no se provee', () => {
    const sala = Sala.create({ id: 's1', nombre: 'Sala A', capacidad: 10, ubicacion: 'Piso 1' });
    expect(sala.activa).toBe(true);
    expect(sala.id).toBe('s1');
    expect(sala.nombre).toBe('Sala A');
    expect(sala.capacidad).toBe(10);
    expect(sala.ubicacion).toBe('Piso 1');
  });

  it('crea una sala con activa=false cuando se provee explícitamente', () => {
    const sala = Sala.create({ id: 's2', nombre: 'Sala B', capacidad: 5, ubicacion: 'Piso 2', activa: false });
    expect(sala.activa).toBe(false);
  });

  it('crea una sala con activa=true cuando se provee explícitamente', () => {
    const sala = Sala.create({ id: 's3', nombre: 'Sala C', capacidad: 8, ubicacion: 'Piso 3', activa: true });
    expect(sala.activa).toBe(true);
  });
});

describe('Sala.reconstitute', () => {
  it('reconstituye una sala con todos sus campos', () => {
    const sala = Sala.reconstitute({ id: 's4', nombre: 'Sala D', capacidad: 20, ubicacion: 'Piso 4', activa: false });
    expect(sala.id).toBe('s4');
    expect(sala.nombre).toBe('Sala D');
    expect(sala.capacidad).toBe(20);
    expect(sala.ubicacion).toBe('Piso 4');
    expect(sala.activa).toBe(false);
  });

  it('reconstituye una sala activa', () => {
    const sala = Sala.reconstitute({ id: 's5', nombre: 'Sala E', capacidad: 15, ubicacion: 'Piso 5', activa: true });
    expect(sala.activa).toBe(true);
  });
});

describe('Sala.update', () => {
  const base = Sala.create({ id: 'u1', nombre: 'Original', capacidad: 10, ubicacion: 'A', activa: true });

  it('actualiza el nombre', () => {
    const updated = base.update({ nombre: 'Nuevo nombre' });
    expect(updated.nombre).toBe('Nuevo nombre');
    expect(updated.capacidad).toBe(10);
    expect(updated.ubicacion).toBe('A');
    expect(updated.activa).toBe(true);
  });

  it('actualiza la capacidad', () => {
    const updated = base.update({ capacidad: 25 });
    expect(updated.capacidad).toBe(25);
    expect(updated.nombre).toBe('Original');
  });

  it('actualiza la ubicación', () => {
    const updated = base.update({ ubicacion: 'Nueva ubicacion' });
    expect(updated.ubicacion).toBe('Nueva ubicacion');
  });

  it('actualiza activa a false', () => {
    const updated = base.update({ activa: false });
    expect(updated.activa).toBe(false);
  });

  it('sin cambios mantiene todos los valores originales', () => {
    const updated = base.update({});
    expect(updated.nombre).toBe('Original');
    expect(updated.capacidad).toBe(10);
    expect(updated.ubicacion).toBe('A');
    expect(updated.activa).toBe(true);
  });
});
