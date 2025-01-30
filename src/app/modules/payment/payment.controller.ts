import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { PaymentService } from "./payment.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";

const initPayment = catchAsync(async (req: Request, res: Response) => {
    const { appointmentId } = req.params;
    const result = await PaymentService.initPayment(req.body, appointmentId)

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment init successfully",
        data: result
    })
})

const paymentSuccess = catchAsync(async (req: Request, res: Response) => {
    const { session_id, patient_id, appointment_id } = req.query;
    const result = await PaymentService.paymentSuccessIntoDB(
        session_id as string,
        patient_id as string,
        appointment_id as string,
        req.io
    )

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Payment success",
        data: result
    })
})
export const PaymentController = {
    initPayment,
    paymentSuccess,
};