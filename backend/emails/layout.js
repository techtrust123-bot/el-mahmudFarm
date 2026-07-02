const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const renderLayout = ({
  title,
  previewText,
  content,
  cta,
  footerText = 'Best regards,<br/>CloudFarm Team'
}) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(title || 'CloudFarm Notification')}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px 32px;color:#ffffff;">
          <h1 style="margin:0;font-size:24px;">${escapeHtml(title || 'CloudFarm Notification')}</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:0.92;">${escapeHtml(previewText || 'A helpful update from your farm dashboard')}</p>
        </div>
        <div style="padding:32px;line-height:1.6;">
          ${content}
          ${cta ? `<p style="margin-top:24px;"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${escapeHtml(cta.label)}</a></p>` : ''}
        </div>
        <div style="padding:0 32px 32px;color:#6b7280;font-size:14px;">
          <p>${footerText}</p>
        </div>
      </div>
    </div>
  </body>
</html>
`;

module.exports = {
  renderLayout
};
