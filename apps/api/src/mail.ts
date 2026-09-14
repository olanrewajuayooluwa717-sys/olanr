import { config } from './config';

type MailPayload = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Best-effort mailer. In production, set SMTP_* or RESEND_API_KEY.
 * Always logs so registration confirmations are visible on the backend.
 */
export async function sendMail(payload: MailPayload): Promise<{ delivered: boolean; mode: string }> {
  console.info('[mail]', {
    to: payload.to,
    subject: payload.subject,
    preview: payload.text.slice(0, 180),
  });

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim() || 'Fishmaster <noreply@fishmaster.app>';

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
        }),
      });
      if (!res.ok) {
        console.warn('[mail] Resend failed', await res.text());
        return { delivered: false, mode: 'resend_error' };
      }
      return { delivered: true, mode: 'resend' };
    } catch (err) {
      console.warn('[mail] Resend error', err);
      return { delivered: false, mode: 'resend_error' };
    }
  }

  const notify = process.env.REGISTRATION_NOTIFY_EMAIL?.trim();
  if (notify && notify !== payload.to) {
    console.info('[mail] Also notify ops inbox:', notify);
  }

  if (!config.isProduction) {
    return { delivered: true, mode: 'dev_log' };
  }

  return { delivered: false, mode: 'logged_only' };
}

export async function sendRegistrationConfirmation(opts: {
  email: string;
  farmerName: string;
  farmName: string;
}): Promise<void> {
  const subject = 'Welcome to Fishmaster — registration confirmed';
  const text = [
    `Hello ${opts.farmerName || 'farmer'},`,
    '',
    `Your Fishmaster account for ${opts.farmName || 'your farm'} is registered.`,
    `Sign in at ${config.webUrl}/login with this email address.`,
    '',
    'If you did not register, please ignore this message.',
    '',
    '— Fishmaster',
  ].join('\n');

  await sendMail({ to: opts.email, subject, text });

  const ops = process.env.REGISTRATION_NOTIFY_EMAIL?.trim();
  if (ops) {
    await sendMail({
      to: ops,
      subject: `New Fishmaster registration: ${opts.email}`,
      text: `New member registered.\nEmail: ${opts.email}\nName: ${opts.farmerName}\nFarm: ${opts.farmName}\n`,
    });
  }
}
