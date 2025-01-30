import express from 'express';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { ContactController } from './contact.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ContactValidation } from './contact.validation';
const router = express.Router();

router.post(
  '/',
  //   auth(
  //     ENUM_USER_ROLE.SUPER_ADMIN,
  //     ENUM_USER_ROLE.DOCTOR,
  //     ENUM_USER_ROLE.PATIENT,
  //     ENUM_USER_ROLE.SUPER_ADMIN,
  //   ),
  validateRequest(ContactValidation.contactZodSchema),
  ContactController.sendEmailToAdmin,
);

export const ContactRoutes = router;
