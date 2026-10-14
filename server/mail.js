'use strict';

const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getTransporter() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = process.env.SMTP_PASS || '';
  const secureValue = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureValue ? secureValue === 'true' : port === 465;

  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM in the server .env file.');
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  }

  return cachedTransporter;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendResetCode(to, code, name) {
  if (!to || !/^\S+@\S+\.\S+$/.test(String(to))) {
    throw new Error('A valid recipient email address is required.');
  }
  if (!/^\d{6}$/.test(String(code))) {
    throw new Error('Reset code must be exactly six digits.');
  }

  const from = (process.env.MAIL_FROM || process.env.SMTP_USER || '').trim();
  if (!from) {
    throw new Error('MAIL_FROM or SMTP_USER must be configured in the server .env file.');
  }

  const safeName = escapeHtml(name || 'there');
  const transporter = getTransporter();
  const result = await transporter.sendMail({
    from,
    to,
    subject: 'Your JCF Connect password reset code',
    text: `Hello ${name || 'there'},\n\nYour JCF Connect password reset code is: ${code}\n\nThis code expires in 10 minutes. If you did not request a password reset, you can ignore this email.\n\nJoy Christian Fellowship – Rongai`,
    html: `<!doctype html><html><body style="margin:0;background:#080f18;color:#f1f5f9;font-family:Arial,sans-serif;padding:24px"><div style="max-width:560px;margin:0 auto;background:#111c2e;border:1px solid #1e3352;border-radius:14px;padding:28px"><h2 style="margin-top:0">JCF Connect</h2><p>Hello ${safeName},</p><p>Use this one-time code to reset your password:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#0c1524;border-radius:10px;padding:16px;text-align:center">${code}</p><p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p><p>If you did not request a password reset, you can ignore this email.</p><hr style="border:0;border-top:1px solid #1e3352"><p style="color:#94a3b8;font-size:12px">Joy Christian Fellowship – Rongai · JCF Connect</p></div></body></html>`
  });

  if (!result || !result.messageId) {
    throw new Error('Email provider did not confirm the message was accepted.');
  }

  return { messageId: result.messageId };
}

module.exports = { sendResetCode };
