import { Password } from './password.vo';
import { WeakPasswordException } from '../exceptions/weak-password.exception';

describe('Password.validate', () => {
  it('acepta una contraseña válida (≥8 chars, mayúscula y número)', () => {
    expect(() => Password.validate('Segura1!')).not.toThrow();
    expect(() => Password.validate('Abcdefg1')).not.toThrow();
  });

  it('lanza WeakPasswordException cuando el password tiene menos de 8 caracteres', () => {
    expect(() => Password.validate('Abc1')).toThrow(WeakPasswordException);
    expect(() => Password.validate('Abc1')).toThrow('mínimo 8 caracteres');
  });

  it('lanza WeakPasswordException cuando no tiene ninguna letra mayúscula', () => {
    expect(() => Password.validate('abcdefg1')).toThrow(WeakPasswordException);
    expect(() => Password.validate('abcdefg1')).toThrow('mayúscula');
  });

  it('lanza WeakPasswordException cuando no contiene ningún número', () => {
    expect(() => Password.validate('Abcdefgh')).toThrow(WeakPasswordException);
    expect(() => Password.validate('Abcdefgh')).toThrow('número');
  });

  it('lanza WeakPasswordException con exactamente 7 caracteres aunque tenga mayúscula y número', () => {
    expect(() => Password.validate('Abcde1f')).toThrow(WeakPasswordException);
  });
});

describe('Password.hash y Password.compare', () => {
  it('hash genera un hash distinto al password original', async () => {
    const raw = 'Segura1!';
    const hashed = await Password.hash(raw);
    expect(hashed).not.toBe(raw);
    expect(typeof hashed).toBe('string');
    expect(hashed.length).toBeGreaterThan(0);
  });

  it('compare retorna true cuando el password coincide con el hash', async () => {
    const raw = 'Segura1!';
    const hashed = await Password.hash(raw);
    const result = await Password.compare(raw, hashed);
    expect(result).toBe(true);
  });

  it('compare retorna false cuando el password no coincide con el hash', async () => {
    const raw = 'Segura1!';
    const hashed = await Password.hash(raw);
    const result = await Password.compare('OtraPass2!', hashed);
    expect(result).toBe(false);
  });
});
