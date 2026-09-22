const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendResetCode(toEmail, code, userName) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const app = process.env.APP_NAME || 'JCF Connect';

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email is not configured. Set SMTP_USER and SMTP_PASS in .env');
  }

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: app + ' – Password reset code',
    text:
      'Hello ' + (userName || '') + ',\n\n' +
      'Your password reset code is: ' + code + '\n\n' +
      'This code expires in 10 minutes.\n' +
      'If you did not request this, ignore this email.\n\n' +
      app,
    html:
      '<p>Hello ' + (userName || '') + ',</p>' +
      '<p>Your password reset code is:</p>' +
      '<p style="font-size:24px;font-weight:bold;letter-spacing:4px;">' + code + '</p>' +
      '<p>This code expires in <strong>10 minutes</strong>.</p>' +
      '<p>If you did not request this, you can ignore this email.</p>' +
      '<p>' + app + ' · Joy Christian Fellowship – Rongai</p>'
  });
}

module.exports = { sendResetCode };