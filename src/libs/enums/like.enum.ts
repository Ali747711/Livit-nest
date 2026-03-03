import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
  MEMBER = 'MEMBER',
  PROPERTY = 'PROPERTY',
  ARTICLE = 'ARTICEL',
}

registerEnumType(LikeGroup, { name: 'LikeGroups' });
