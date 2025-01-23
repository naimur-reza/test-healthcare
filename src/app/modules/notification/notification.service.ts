import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";
import { NotificationRecipientType } from "./notification.interface";

const getUsersNotificationFromDB = async (
  userId: string,
  role: NotificationRecipientType
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
  if (user?.role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: {
        email: user?.email,
      }
    })
    recipientId = doctor?.id;
  }
  if (user?.role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({
      where: {
        email: user?.email,
      }
    })
    recipientId = patient?.id;
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
}

const getUsersNotificationByIdFromDB = async (
  userId: string,
  role: NotificationRecipientType,
  notificationId: string
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
  if (user.role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: {
        email: user?.email,
      }
    })
    if (!doctor) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Doctor not found');
    }
    recipientId = doctor?.id;
  }
  if (user.role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({
      where: {
        email: user.email,
      }
    })
    if (!patient) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
    }
    recipientId = patient.id;
  }

  const notification = await prisma.notification.findUnique({
    where: {
      id: notificationId,
      recipientId,
      recipientType: role,
    }
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
}

export const NotificationService = {
  getUsersNotificationFromDB,
  getUsersNotificationByIdFromDB,
}