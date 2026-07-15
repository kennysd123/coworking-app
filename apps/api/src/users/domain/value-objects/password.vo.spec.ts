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
