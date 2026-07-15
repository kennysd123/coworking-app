import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../../../users/domain/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Restringe el acceso al endpoint a los roles listados. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
