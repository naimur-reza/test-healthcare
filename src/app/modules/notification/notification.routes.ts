import { Router } from "express";
import { ENUM_USER_ROLE } from "../../../enums/user";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get(
  '/my-notifications',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.PATIENT,
    ENUM_USER_ROLE.DOCTOR
  ),
  NotificationController.getUsersNotification,
)

router.get(
  '/my-notifications/:notificationId',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.PATIENT,
    ENUM_USER_ROLE.DOCTOR
  ),
  NotificationController.getUsersNotificationById,
)

router.patch(
  '/toggle-read-unread/:notificationId',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.PATIENT,
    ENUM_USER_ROLE.DOCTOR
  ),
  NotificationController.toggleMarkNotificationAsRead,
)

router.delete(
  '/delete-notification/:notificationId',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.ADMIN,
    ENUM_USER_ROLE.PATIENT,
    ENUM_USER_ROLE.DOCTOR
  ),
  NotificationController.deleteNotification,
)

export const NotificationRoutes = router;