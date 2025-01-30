import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { Request, Response } from 'express';
import { ContactService } from './contact.service';

const sendEmailToAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await ContactService.sendEmailToAdmin(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Email sent successfully!',
    data: result,
  });
});

export const ContactController = {
  sendEmailToAdmin,
};
