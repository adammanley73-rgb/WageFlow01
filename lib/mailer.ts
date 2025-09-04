import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT || 587);
const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;
const from = process.env.SMTP_FROM || user;

export const mailer = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

export async function sendResetEmail(to: string, link: string) {
  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 12px">Reset your WageFlow password</h2>
      <p>Click the button below to reset your password. The link expires in 30 minutes.</p>
      <p><a href="${link}" style="display:inline-block;background:#0B5BD3;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Reset password</a></p>
      <p>Or copy this link:</p>
      <p style="word-break:break-all"><a href="${link}">${link}</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  await mailer.sendMail({
    from,
    to,
    subject: 'WageFlow password reset',
    html,
  });
}
