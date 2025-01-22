import { Router } from "express";
import { ENUM_USER_ROLE } from "../../../enums/user";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get(
  '/my-notifications',
  auth(ENUM_USER_ROLE.PATIENT, ENUM_USER_ROLE.DOCTOR),
  NotificationController.getUsersNotification,
)

export const NotificationRoutes = router;