// utils/brevoMailer.js
require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

// --- Configure Brevo ---
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.basePath = 'https://api.brevo.com/v3';

const RAW_KEY = (process.env.BREVO_API_KEY || '').trim();
defaultClient.authentications['api-key'].apiKey = RAW_KEY;
defaultClient.authentications['partner-key'].apiKey = RAW_KEY;

if (!RAW_KEY) console.warn('[Brevo] API key missing!');
else console.log('[Brevo] Mailer ready (key length=%d)', RAW_KEY.length);

const api = new SibApiV3Sdk.TransactionalEmailsApi();

// Utility to send emails
async function sendBrevoEmail({ to, subject, html }) {
  const appName = process.env.APP_NAME || 'MealMatrix';
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || '').trim();
  const senderName = (process.env.BREVO_SENDER_NAME || appName).trim();

  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL missing');
  if (!RAW_KEY) throw new Error('BREVO_API_KEY missing');

  const payload = new SibApiV3Sdk.SendSmtpEmail();
  payload.sender = { email: senderEmail, name: senderName };
  payload.to = [{ email: to }];
  payload.subject = subject;
  payload.htmlContent = html;

  try {
    await api.sendTransacEmail(payload);
    console.log(`[Brevo] Email sent → ${to}`);
  } catch (err) {
    console.error('[Brevo] sendTransacEmail failed:', err?.response?.text || err.message);
    throw err;
  }
}

// Email template for new user creation
async function sendNewUserEmail({ to, name, tempPassword }) {
  const appName = process.env.APP_NAME || 'MealMatrix';
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
      <h2>Welcome to ${appName}</h2>
      <p>Hello <b>${name}</b>,</p>
      <p>Your ${appName} account has been created by the admin.</p>
      <p><b>Temporary Password:</b> ${tempPassword}</p>
      <p>Please log in and change your password immediately after your first login.</p>
      <p>Best regards,<br>${appName} Team</p>
    </div>
  `;
  await sendBrevoEmail({ to, subject: `${appName} Account Created`, html });
}

module.exports = { sendNewUserEmail };
