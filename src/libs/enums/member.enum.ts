import { registerEnumType } from '@nestjs/graphql';

export enum MemberType {
  USER = 'USER',
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  DELETE = 'DELETE',
}

export enum MemberAuthType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  TELEGRAM = 'TELEGRAM',
}

registerEnumType(MemberType, { name: 'MemberType', description: 'List of member types' });
registerEnumType(MemberStatus, { name: 'MemberStatus', description: 'List of member status' });
registerEnumType(MemberAuthType, { name: 'MemberAuthType', description: 'List of member auth type' });
