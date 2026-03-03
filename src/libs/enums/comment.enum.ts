import { registerEnumType } from '@nestjs/graphql';

export enum CommentStatus {
  ACTIVE = 'ACTIVE',
  DELETE = 'DELETE',
}

export enum CommentGroup {
  MEMBER = 'MEMBER',
  ARTICLE = 'ARTICLE',
  PROPERTY = 'PROPERTY',
}

registerEnumType(CommentStatus, {
  name: 'CommentStatus',
});
registerEnumType(CommentGroup, {
  name: 'CommentGroup',
});
