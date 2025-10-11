const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,         // e.g. smtp.gmail.com or your provider
  port: Number(process.env.SMTP_PORT), // 465/587
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendNewUserEmail({ to, name, tempPassword }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  const html = `
    <p>Hi ${name},</p>
    <p>Your account has been created.</p>
    <p><b>Temporary Password:</b> ${tempPassword}</p>
    <p>Please sign in here: <a href="${appUrl}/user/signin">${appUrl}/user/signin</a> and change your password.</p>
    <p>Best,<br/>Smart Canteen Team</p>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: 'Your Smart Canteen account',
    html,
  });
}

module.exports = { sendNewUserEmail };
