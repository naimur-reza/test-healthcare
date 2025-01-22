import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import prisma from "../../../shared/prisma";

const getUsersNotificationFromDB = async (userId: string, role: any) => {
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
  
  return notifications;
}

export const NotificationService = {
  getUsersNotificationFromDB,
}