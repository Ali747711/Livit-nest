import { registerEnumType } from '@nestjs/graphql';

export enum MessageStatus {
  READ = 'READ',
  UNREAD = 'UNREAD',
}
registerEnumType(MessageStatus, {
  name: 'MessageStatus',
});
