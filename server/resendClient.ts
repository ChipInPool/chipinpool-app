// Resend email client integration
import { Resend } from 'resend';

let connectionSettings: any;

function isReplitEnvironment() {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

async function getCredentials() {
  // If not on Replit, use environment variables directly
  if (!isReplitEnvironment()) {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable not set');
    }
    
    return { 
      apiKey, 
      fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@chipin.app' 
    };
  }

  // On Replit, use connectors
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@chipin.app'
  };
}

export async function sendPoolInviteEmail(
  to: string,
  inviterName: string,
  poolTitle: string,
  poolUrl: string
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `${inviterName} invited you to chip in for "${poolTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a2e;">You're Invited to ChipIn!</h1>
          <p style="font-size: 16px; color: #333;">
            <strong>${inviterName}</strong> has invited you to contribute to a pool for <strong>"${poolTitle}"</strong>.
          </p>
          <p style="font-size: 14px; color: #666;">
            ChipIn makes it easy to pool funds with friends for trips, gifts, purchases, and more.
          </p>
          <a href="${poolUrl}" style="display: inline-block; background: linear-gradient(to right, #c8ff00, #a8d900); color: #1a1a2e; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">
            View Pool & Chip In
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });
    
    console.log(`Email invite sent to ${to} for pool "${poolTitle}"`);
    return true;
  } catch (error: any) {
    console.error('Failed to send email invite:', error.message);
    return false;
  }
}
