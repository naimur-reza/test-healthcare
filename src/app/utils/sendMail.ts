import nodemailer from 'nodemailer';
import config from '../../config';

export async function sendEmail(to: string, html: string, subject: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: config.email,
      pass: config.app_pass,
    },
  });

  await transporter.sendMail({
    from: config.email,
    to,
    subject: subject,
    html,
  });
}
