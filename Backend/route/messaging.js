// route/messaging.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// --- Email transport (uses your existing SMTP_* env vars) ---
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Select audience -> Mongo filter
function buildAudienceFilter(audience) {
  switch (audience) {
    case 'all':
      return { role: 'CUSTOMER', status: 'ACTIVE' };
    case 'active': // last 30 days
      return { role: 'CUSTOMER', status: 'ACTIVE', updatedAt: { $gte: new Date(Date.now() - 30*24*3600e3) } };
    case 'loyalty':
      return { role: 'CUSTOMER', status: 'ACTIVE', loyaltyMember: true }; // add this flag to users if you use it
    case 'new':
      return { role: 'CUSTOMER', status: 'ACTIVE', createdAt: { $gte: new Date(Date.now() - 7*24*3600e3) } };
    case 'dormant': // inactive 60+ days
      return { role: 'CUSTOMER', status: 'ACTIVE', updatedAt: { $lte: new Date(Date.now() - 60*24*3600e3) } };
    default:
      return { role: 'CUSTOMER', status: 'ACTIVE' };
  }
}

function validatePayload(b) {
  const { messageType, audience, subject, message, schedule } = b || {};
  if (!['email','sms','push'].includes(messageType)) return 'Invalid messageType';
  if (!['all','active','loyalty','new','dormant'].includes(audience)) return 'Invalid audience';
  if (!message || typeof message !== 'string') return 'Message is required';
  if (messageType === 'email' && !subject) return 'Subject is required for email';
  if (!schedule || !['now','optimal','custom'].includes(schedule.mode)) return 'Invalid schedule mode';
  if (schedule.mode === 'custom' && (!schedule.at || isNaN(new Date(schedule.at)))) return 'Invalid custom schedule time';
  return null;
}

// POST /api/messaging/send  (send or schedule)
router.post('/send', auth, requireRole('ADMIN', 'PROMO_OFFICER'), async (req, res) => {
  try {
    const err = validatePayload(req.body);
    if (err) return res.status(400).json({ message: err });

    const { messageType, audience, subject, message, schedule } = req.body;

    // fetch recipients (only those with email for email flow)
    const filter = buildAudienceFilter(audience);
    const projection = messageType === 'email' ? { email: 1, firstName: 1, lastName: 1 } : { phone: 1, firstName: 1, lastName: 1 };
    const recipients = await User.find(filter, projection).lean();

    if (recipients.length === 0) {
      return res.status(200).json({ sent: 0, scheduled: 0, message: 'No recipients for this audience.' });
    }

    // ——— scheduling strategy ———
    if (schedule.mode !== 'now') {
      // You can persist a “MessageJob” document and have a cron/queue worker pick it up.
      // For now we just acknowledge.
      return res.status(202).json({
        scheduled: recipients.length,
        when: schedule.mode === 'optimal' ? 'within next 24h (optimal)' : new Date(schedule.at).toISOString(),
        message: 'Scheduled (stub). Implement a job/queue worker to deliver later.',
      });
    }

    // ——— send NOW ———
    let count = 0;

    if (messageType === 'email') {
      // naive bulk send in batches (for demo). In production use a provider (SES, Sendgrid) or a queue.
      const from = process.env.MAIL_FROM || process.env.SMTP_USER;
      const batches = [];
      const BATCH = 40;
      for (let i = 0; i < recipients.length; i += BATCH) {
        batches.push(recipients.slice(i, i + BATCH));
      }

      for (const batch of batches) {
        // Use BCC for bulk (simple demo). Or loop per-recipient for personalized content.
        const bcc = batch.map(u => u.email).filter(Boolean);
        if (bcc.length === 0) continue;

        await transport.sendMail({
          from,
          to: from,            // primary "to" (so mail isn't rejected for empty to)
          bcc,                 // audience
          subject: subject,
          html: `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
              <p>${message.replace(/\n/g,'<br/>')}</p>
              <hr/>
              <small>Sent by Smart Canteen</small>
            </div>
          `,
        });
        count += bcc.length;
      }

      return res.status(200).json({ sent: count, type: 'email' });
    }

    if (messageType === 'sms') {
      // stub: integrate Twilio or similar here
      // recipients.forEach(r => twilio.messages.create({ to: r.phone, body: message }));
      return res.status(202).json({ scheduled: recipients.length, type: 'sms', note: 'Integrate SMS provider' });
    }

    if (messageType === 'push') {
      // stub: integrate FCM/OneSignal here
      return res.status(202).json({ scheduled: recipients.length, type: 'push', note: 'Integrate push provider' });
    }

    return res.status(400).json({ message: 'Unsupported type' });
  } catch (e) {
    console.error('messaging/send error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// quick count endpoint (for showing “Estimated reach” from real DB)
router.get('/audience-size', auth, requireRole('ADMIN','PROMO_OFFICER'), async (req,res) => {
  try {
    const { audience = 'all' } = req.query;
    const count = await User.countDocuments(buildAudienceFilter(audience));
    res.json({ audience, count });
  } catch (e) {
    console.error('audience-size error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
