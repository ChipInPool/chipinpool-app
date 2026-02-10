// Resend email client integration
import { Resend } from 'resend';
import { emailWrapper, emailHeading, emailText, emailButton } from './emailTemplates';

let connectionSettings: any;

function isReplitEnvironment() {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

async function getCredentials() {
  // If not on Replit, use environment variables directly
  if (!isReplitEnvironment()) {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    console.log('Resend credentials check:', {
      hasApiKey: !!apiKey,
      fromEmail,
      isReplit: false
    });
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable not set');
    }
    
    return { apiKey, fromEmail };
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
    
    const html = emailWrapper({
      body: [
        emailHeading("You're Invited to ChipIn!"),
        emailText(`<strong>${inviterName}</strong> has invited you to contribute to a pool for "<strong>${poolTitle}</strong>".`),
        emailText('ChipIn makes it easy to pool funds with friends for trips, gifts, purchases, and more.'),
        emailButton('View Pool & Chip In', poolUrl),
      ].join(''),
      preheaderText: `${inviterName} invited you to chip in for "${poolTitle}"`,
    });

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `${inviterName} invited you to chip in for "${poolTitle}"`,
      html,
    });
    
    // Check if Resend returned an error
    if (result.error) {
      console.error('Email invite failed:', {
        to,
        poolTitle,
        error: result.error.message,
        statusCode: (result.error as any).statusCode
      });
      return false;
    }
    
    console.log(`Email invite sent to ${to} for pool "${poolTitle}", id: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Failed to send email invite:', {
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
      to,
      poolTitle
    });
    return false;
  }
}
