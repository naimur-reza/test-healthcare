import express from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';

const router = express.Router();

router.post(
    '/init/:appointmentId',
    auth(ENUM_USER_ROLE.PATIENT),
    PaymentController.initPayment
);

router.post(
    '/payment-success',
    auth(ENUM_USER_ROLE.PATIENT),
    PaymentController.paymentSuccess
)


export const paymentRoutes = router;

