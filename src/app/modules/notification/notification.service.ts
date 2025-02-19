import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import prisma from '../../../shared/prisma';
import { NotificationRecipientType } from './notification.interface';
import { UserRole, UserStatus } from '@prisma/client';
import { Server } from 'socket.io';
import { slugGenerator } from '../../../shared/utils';

const sendNotificationToDB = async (
  userId: string,
  payload: Record<string, string>,
  io: Server,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This user not found');
  }
  if (user.status !== UserStatus.ACTIVE) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This user is not active');
  }

  const allUsers = await prisma.user.findMany({
    where: { status: UserStatus.ACTIVE },
  });

  const roleToRecipientType: Record<UserRole, NotificationRecipientType> = {
    [UserRole.SUPER_ADMIN]: NotificationRecipientType.SUPER_ADMIN,
    [UserRole.ADMIN]: NotificationRecipientType.ADMIN,
    [UserRole.DOCTOR]: NotificationRecipientType.DOCTOR,
    [UserRole.PATIENT]: NotificationRecipientType.PATIENT,
  };

  const notificationPromises = allUsers.map(async user => {
    const recipientType = roleToRecipientType[user.role];
    if (!recipientType) return;

    const notificationPayload = {
      title: payload.title,
      content: payload.content,
      recipientId: user.id,
      recipientType,
      slug: slugGenerator(payload.title as string),
    };

    await prisma.notification.create({ data: notificationPayload });

    io.to(user.id).emit('newNotification', notificationPayload);
  });

  await Promise.all(notificationPromises);

  console.log('Notifications sent successfully');
};

const getUsersNotificationFromDB = async (
  userId: string,
  role: NotificationRecipientType,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  let recipientId;
  if (user?.role === 'DOCTOR' || user?.role === 'PATIENT') {
    recipientId = user?.id;
  }

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId,
      recipientType: role,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const unreadCount = await prisma.notification.count({
    where: {
      recipientId,
      recipientType: role,
      isRead: false,
    },
  });

  return {
    notifications,
    unreadCount,
  };
};

const getUsersNotificationByIdFromDB = async (
  userId: string,
  role: NotificationRecipientType,
  notificationId: string,
) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  let recipientId;
  if (user.role === 'DOCTOR' || user.role === 'PATIENT') {
    recipientId = user?.id;
  }

  const notification = await prisma.notification.findUnique({
    where: {
      id: notificationId,
      recipientId,
      recipientType: role,
    },
  });
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  if (!notification.isRead) {
    const updatedNotification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });
    return updatedNotification;
  }

  return notification;
};

const toggleMarkNotificationAsReadFromDB = async (
  userId: string,
  role: NotificationRecipientType,
  notificationId: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const recipientId =
    user.role === 'DOCTOR' || user.role === 'PATIENT' ? user.id : undefined;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (
    !notification ||
    notification.recipientId !== recipientId ||
    notification.recipientType !== role
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: !notification.isRead },
  });
};

const deleteNotificationFromDB = async (
  userId: string,
  role: NotificationRecipientType,
  notificationId: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const recipientId = await (async () => {
    if (user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({
        where: { email: user.email },
      });
      if (!doctor) throw new ApiError(httpStatus.NOT_FOUND, 'Doctor not found');
      return doctor.id;
    } else if (user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { email: user.email },
      });
      if (!patient)
        throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
      return patient.id;
    }
  })();

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (
    !notification ||
    notification.recipientId !== recipientId ||
    notification.recipientType !== role
  ) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  return prisma.notification.delete({
    where: { id: notificationId },
  });
};

export const NotificationService = {
  sendNotificationToDB,
  getUsersNotificationFromDB,
  getUsersNotificationByIdFromDB,
  toggleMarkNotificationAsReadFromDB,
  deleteNotificationFromDB,
};
