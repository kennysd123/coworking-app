import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca un endpoint como público: JwtAuthGuard lo omite. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
