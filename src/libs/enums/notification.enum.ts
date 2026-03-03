import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
  MESSAGE = 'MESSAGE',
}
registerEnumType(NotificationType, {
  name: 'NotificationType',
});

export enum NotificationStatus {
  READ = 'READ',
  UNREAD = 'UNREAD',
}
registerEnumType(NotificationStatus, {
  name: 'NotificationStatus',
});
