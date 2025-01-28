export enum NotificationRecipientType {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  DOCTOR = "DOCTOR",
  PATIENT = "PATIENT",
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  recipientId: string;
  recipientType: NotificationRecipientType;
  isRead: boolean;
  createdAt: Date;
}

/* 
model Notification {
  id            String   @id @default(uuid())
  title         String
  content       String
  recipientId   String   // ID of the recipient (Doctor or Patient)
  recipientType NotificationRecipientType   // Either "DOCTOR" or "PATIENT"
  isRead        Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@map("notifications")
}

enum NotificationRecipientType {
  DOCTOR
  PATIENT
}
*/