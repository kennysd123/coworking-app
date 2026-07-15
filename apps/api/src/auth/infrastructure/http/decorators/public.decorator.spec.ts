import { SetMetadata } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from './public.decorator';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn().mockReturnValue(() => {}),
}));

describe('Public decorator', () => {
  it('llama a SetMetadata con IS_PUBLIC_KEY y true', () => {
    Public();
    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
  });

  it('IS_PUBLIC_KEY tiene el valor correcto', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
