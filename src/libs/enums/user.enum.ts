import { registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  INTERN = 'INTERN',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User roles',
});
