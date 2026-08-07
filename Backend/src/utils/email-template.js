/**
 * Email HTML template oluştur
 * Plain text'i HTML'e çevir + tracking pixel ekle
 */
function createEmailHtmlTemplate(bodyText, trackingPixelHtml = "") {
  // Text'i paragraf paragraf HTML'e çevir
  const paragraphs = String(bodyText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${escapeHtml(line)}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 0 20px;">
              ${paragraphs}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${trackingPixelHtml}
</body>
</html>
  `.trim();
}

/**
 * HTML escape
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  createEmailHtmlTemplate,
  escapeHtml,
};
