import config from '../../../config';
import { sendEmail } from '../../utils/sendMail';
import { IContact } from './contact.interface';

const sendEmailToAdmin = async (data: IContact) => {
  const { name, email, subject, message } = data;

  const emailHtml = `
  <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; background: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #333;">New Contact Form Submission</h2>
      <p style="color: #555;"><strong>Name:</strong> ${name}</p>
      <p style="color: #555;"><strong>Email:</strong> ${email}</p>
      <p style="color: #555;"><strong>Subject:</strong> ${subject}</p>
      <p style="color: #555;"><strong>Message:</strong></p>
      <p style="background: #f8f8f8; padding: 10px; border-radius: 5px; color: #333;">${message}</p>
      <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #777; font-size: 12px;">This email was sent from the contact form on your website.</p>
    </div>
  </div>`;

  await sendEmail(config.email as string, emailHtml, subject);
};

export const ContactService = {
  sendEmailToAdmin,
};
