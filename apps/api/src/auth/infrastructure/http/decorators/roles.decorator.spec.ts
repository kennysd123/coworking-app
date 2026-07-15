import { SetMetadata } from '@nestjs/common';
import { Roles, ROLES_KEY } from './roles.decorator';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn().mockReturnValue(() => {}),
}));

describe('Roles decorator', () => {
  it('llama a SetMetadata con ROLES_KEY y los roles proporcionados', () => {
    Roles('admin', 'premium');
    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, ['admin', 'premium']);
  });

  it('llama a SetMetadata con un único rol', () => {
    Roles('regular');
    expect(SetMetadata).toHaveBeenCalledWith(ROLES_KEY, ['regular']);
  });

  it('ROLES_KEY tiene el valor correcto', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
