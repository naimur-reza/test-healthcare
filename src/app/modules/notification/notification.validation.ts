import { z } from "zod";

export const NotificationRecipientTypeSchema = z.enum(["DOCTOR", "PATIENT"]);

export const NotificationValidationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  recipientId: z.string(),
  recipientType: NotificationRecipientTypeSchema,
  isRead: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
});