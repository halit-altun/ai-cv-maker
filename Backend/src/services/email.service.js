const nodemailer = require("nodemailer");
const { PLATFORM_BRAND_NAME } = require("../config/platform-brand");
const { normalizeAttachmentsForSend } = require("../utils/email-attachment.utils");

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  if (host === "smtp.gmail.com" || !host) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function buildFromAddress(fromName) {
  const address = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@cvaimaker.local";
  // Açıkça verilen gönderici adı öncelikli (outreach = aday adı); yoksa env / marka
  const name =
    String(fromName || "").trim() ||
    process.env.SMTP_FROM_NAME ||
    PLATFORM_BRAND_NAME;
  return `"${name}" <${address}>`;
}

async function sendMail({ to, subject, text, html, fromName, replyTo, attachments }) {
  const transporter = createTransporter();
  const from = buildFromAddress(fromName);
  let normalizedAttachments;
  try {
    normalizedAttachments = normalizeAttachmentsForSend(attachments);
  } catch (err) {
    console.error("[email] Geçersiz PDF eki:", err.message);
    throw err;
  }

  if (!transporter) {
    console.warn(`[email] SMTP yok — mail loglandı: ${subject} -> ${to}`);
    console.warn(text);
    if (normalizedAttachments?.length) {
      console.warn(
        `[email] attachment(s): ${normalizedAttachments
          .map((a) => `${a.filename} (${a.content.length} bytes)`)
          .join(", ")}`
      );
    }
    return { sent: false, logged: true };
  }

  await transporter.sendMail({
    from,
    to,
    replyTo: replyTo || process.env.SMTP_REPLY_TO || process.env.SMTP_USER,
    subject,
    text,
    html,
    attachments: normalizedAttachments,
    priority: "normal",
  });

  return { sent: true, logged: false };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildPasswordResetEmailHtml({ resetUrl, expiresInMinutes }) {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Şifre Sıfırlama</title>
</head>
<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#222;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#111;">Şifrenizi sıfırlayın</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
      Bu bağlantı <strong>${expiresInMinutes} dakika</strong> içinde geçerliliğini yitirir.
    </p>
    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">
        Şifreyi sıfırla
      </a>
    </p>
    <p style="margin:0;font-size:13px;color:#666;">
      Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.
    </p>
  </div>
</body>
</html>`;
}

function buildEmailVerificationHtml({ code, expiresInMinutes }) {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>E-posta Doğrulama</title>
</head>
<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#222;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#111;">E-postanızı doğrulayın</h2>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
      Hesabınızı doğrulamak için bu kodu kullanın.
      Kod <strong>${expiresInMinutes} dakika</strong> içinde geçerliliğini yitirir.
    </p>
    <p style="margin:0 0 24px;font-size:32px;letter-spacing:8px;font-weight:700;color:#111;text-align:center;">
      ${escapeHtml(code)}
    </p>
    <p style="margin:0;font-size:13px;color:#666;">
      Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.
    </p>
  </div>
</body>
</html>`;
}

async function sendPasswordResetEmail({ to, resetUrl, expiresInMinutes }) {
  const subject = `${PLATFORM_BRAND_NAME} — şifre sıfırlama`;
  const text = [
    `${PLATFORM_BRAND_NAME} şifre sıfırlama`,
    "",
    `Bu bağlantı ${expiresInMinutes} dakika içinde geçerliliğini yitirir:`,
    resetUrl,
    "",
    "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.",
  ].join("\n");
  const html = buildPasswordResetEmailHtml({ resetUrl, expiresInMinutes });

  return sendMail({
    to,
    subject,
    text,
    html,
    fromName: `${PLATFORM_BRAND_NAME} Auth`,
  });
}

async function sendEmailVerificationCode({ to, code, expiresInMinutes }) {
  const subject = `${PLATFORM_BRAND_NAME} — e-posta doğrulama kodu`;
  const text = [
    `${PLATFORM_BRAND_NAME} e-posta doğrulama`,
    "",
    `Doğrulama kodunuz: ${code}`,
    `Bu kod ${expiresInMinutes} dakika içinde geçerliliğini yitirir.`,
    "",
    "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.",
  ].join("\n");
  const html = buildEmailVerificationHtml({ code, expiresInMinutes });

  return sendMail({
    to,
    subject,
    text,
    html,
    fromName: `${PLATFORM_BRAND_NAME} Auth`,
  });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail,
  sendEmailVerificationCode,
};
