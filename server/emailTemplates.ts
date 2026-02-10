export function getBaseUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPLIT_DOMAINS?.split(',')[0]) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
  }
  if (process.env.WEBSITE_HOSTNAME) {
    return `https://${process.env.WEBSITE_HOSTNAME}`;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  return 'https://chipin.app';
}

export function emailWrapper(options: {
  body: string;
  preheaderText?: string;
}): string {
  const { body, preheaderText } = options;
  const baseUrl = getBaseUrl();
  const logoUrl = `${baseUrl}/logo.png`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>ChipIn</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  ${preheaderText ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheaderText}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a1628 0%, #111d33 100%); padding: 32px 32px 28px; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <img src="${logoUrl}" alt="ChipIn" width="48" height="48" style="display: block; margin: 0 auto; width: 48px; height: 48px; border-radius: 12px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 700; color: #66ffcc; letter-spacing: -0.5px;">ChipIn</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px; background-color: #ffffff;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 28px 32px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #64748b; font-weight: 500;">ChipIn &mdash; Pool funds together. Pay smarter.</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="${baseUrl}" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #94a3b8; text-decoration: underline;">Manage Preferences</a>
                    <span style="color: #cbd5e1; padding: 0 8px;">|</span>
                    <a href="${baseUrl}" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="https://twitter.com/chipinapp" style="display: inline-block; padding: 0 8px; text-decoration: none; font-size: 13px; color: #94a3b8;">Twitter</a>
                    <a href="https://instagram.com/chipinapp" style="display: inline-block; padding: 0 8px; text-decoration: none; font-size: 13px; color: #94a3b8;">Instagram</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #94a3b8;">&copy; 2025 ChipIn. All rights reserved.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailHeading(text: string): string {
  return `<h1 style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 16px; line-height: 1.3;">${text}</h1>`;
}

export function emailText(text: string, options?: { muted?: boolean; small?: boolean; center?: boolean }): string {
  const color = options?.muted ? '#64748b' : '#334155';
  const fontSize = options?.small ? '14px' : '16px';
  const textAlign = options?.center ? 'center' : 'left';
  return `<p style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: ${fontSize}; line-height: 1.6; color: ${color}; margin: 0 0 16px; text-align: ${textAlign};">${text}</p>`;
}

export function emailHighlight(value: string, label?: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <div style="background-color: #0a1628; border-radius: 12px; padding: 24px 32px; display: inline-block; text-align: center;">
        <span style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: #66ffcc; display: block; line-height: 1.2;">${value}</span>
        ${label ? `<span style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #94a3b8; display: block; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px;">${label}</span>` : ''}
      </div>
    </td>
  </tr>
</table>`;
}

export function emailButton(text: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" target="_blank" style="display: inline-block; background-color: #66ffcc; color: #0a1628; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; mso-padding-alt: 0;">
        <!--[if mso]><i style="letter-spacing: 32px; mso-font-width: -100%; mso-text-raise: 21pt;">&nbsp;</i><![endif]-->
        <span style="mso-text-raise: 10.5pt;">${text}</span>
        <!--[if mso]><i style="letter-spacing: 32px; mso-font-width: -100%;">&nbsp;</i><![endif]-->
      </a>
    </td>
  </tr>
</table>`;
}

export function emailInfoCard(items: Array<{ label: string; value: string }>): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">
              ${item.label}
            </td>
          </tr>
          <tr>
            <td style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #0f172a;">
              ${item.value}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 16px 0;">
  <tr>
    <td style="padding: 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
      </table>
    </td>
  </tr>
</table>`;
}

export function emailDivider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td style="border-top: 1px solid #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
</table>`;
}

export function emailAlert(text: string, type: 'success' | 'warning' | 'error' | 'info'): string {
  const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '&#10003;' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '&#9888;' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '&#10007;' },
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: '&#8505;' },
  };
  const c = colors[type] || colors.info;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
  <tr>
    <td style="background-color: ${c.bg}; border-left: 4px solid ${c.border}; border-radius: 8px; padding: 16px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: top; padding-right: 12px;">
            <span style="font-size: 18px; color: ${c.border};">${c.icon}</span>
          </td>
          <td style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: ${c.text};">
            ${text}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function emailVerificationCode(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <div style="background-color: #0a1628; border-radius: 12px; padding: 24px 40px; display: inline-block; text-align: center;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; color: #66ffcc; letter-spacing: 10px;">${code}</span>
      </div>
    </td>
  </tr>
</table>`;
}

export function emailFeatureList(items: string[]): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding: 6px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align: top; padding-right: 12px; width: 24px;">
              <span style="display: inline-block; width: 22px; height: 22px; background-color: #ecfdf5; border-radius: 50%; text-align: center; line-height: 22px; font-size: 13px; color: #10b981;">&#10003;</span>
            </td>
            <td style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.5; color: #334155;">
              ${item}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
  ${rows}
</table>`;
}
