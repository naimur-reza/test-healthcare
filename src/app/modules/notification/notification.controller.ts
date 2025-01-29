import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { NotificationService } from "./notification.service";
import { Request, Response } from "express";

const sendNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const userId = user!.userId as string;
  const role = user!.role;
  const notificationData = req.body;

  const result = await NotificationService.sendNotificationToDB(
    userId,
    notificationData,
    req.io
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification sent successfully',
    data: result,
  });
})

const getUsersNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const userId = user!.userId as string;
  const role = user!.role;

  const result = await NotificationService.getUsersNotificationFromDB(userId, role);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieval successfully',
    data: result,
  });
});

const getUsersNotificationById = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const userId = user!.userId as string;
  const role = user!.role;
  const notificationId = req.params.notificationId;

  const result = await NotificationService.getUsersNotificationByIdFromDB(
    userId,
    role,
    notificationId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification retrieval successfully',
    data: result,
  });
})

const toggleMarkNotificationAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const userId = user!.userId as string;
  const role = user!.role;
  const notificationId = req.params.notificationId;

  const result = await NotificationService.toggleMarkNotificationAsReadFromDB(
    userId,
    role,
    notificationId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read successfully',
    data: result,
  });
})

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const userId = user!.userId as string;
  const role = user!.role;
  const notificationId = req.params.notificationId;

  const result = await NotificationService.deleteNotificationFromDB(
    userId,
    role,
    notificationId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read successfully',
    data: result,
  });
})

export const NotificationController = {
  sendNotification,
  getUsersNotification,
  getUsersNotificationById,
  toggleMarkNotificationAsRead,
  deleteNotification,
}