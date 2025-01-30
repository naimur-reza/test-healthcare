import { z } from 'zod';

export const NotificationRecipientTypeSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'DOCTOR',
  'PATIENT',
]);

export const NotificationValidationSchema = z.object({
  body: z.object({
    title: z.string(),
    content: z.string(),
    isRead: z.boolean().default(false),
    createdAt: z.date().default(() => new Date()),
  }),
});
