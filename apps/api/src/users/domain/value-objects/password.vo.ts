import * as bcrypt from 'bcryptjs';
import { WeakPasswordException } from '../exceptions/weak-password.exception';

const BCRYPT_ROUNDS = 12;

export class Password {
  private static readonly MIN_LENGTH = 8;
  private static readonly UPPERCASE_RE = /[A-Z]/;
  private static readonly DIGIT_RE = /[0-9]/;

  /** Lanza WeakPasswordException si el password no cumple la política. */
  static validate(raw: string): void {
    if (raw.length < Password.MIN_LENGTH) {
      throw new WeakPasswordException('mínimo 8 caracteres');
    }
    if (!Password.UPPERCASE_RE.test(raw)) {
      throw new WeakPasswordException('al menos una mayúscula');
    }
    if (!Password.DIGIT_RE.test(raw)) {
      throw new WeakPasswordException('al menos un número');
    }
  }

  static async hash(raw: string): Promise<string> {
    return bcrypt.hash(raw, BCRYPT_ROUNDS);
  }

  static async compare(raw: string, hash: string): Promise<boolean> {
    return bcrypt.compare(raw, hash);
  }
}
