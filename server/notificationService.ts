// Notification Service - Uses Resend for email and ClickSend for SMS
// Reference: Resend integration connection:conn_resend_01KF2682PY53SZZBAFJ7HQKGNX

import { Resend } from 'resend';

interface NotificationSettings {
  apiKey: string;
  fromEmail: string;
}

let connectionSettings: any;

function isReplitEnvironment() {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

async function getResendCredentials(): Promise<NotificationSettings> {
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
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email || 'noreply@chipin.app'
  };
}

async function getResendClient() {
  const credentials = await getResendCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

function getBaseUrl(): string {
  // Support both Replit and Azure production environments
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

function formatPhoneNumber(phone: string): string {
  let phoneNumber = phone.replace(/\D/g, '');
  if (!phoneNumber.startsWith('1') && phoneNumber.length === 10) {
    phoneNumber = '1' + phoneNumber;
  }
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+' + phoneNumber;
  }
  return phoneNumber;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    console.log('[Email] Sending email:', { to, subject, from: fromEmail });
    
    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    // Check if Resend returned an error in the response
    if (result.error) {
      console.error('[Email] Resend API error:', {
        to,
        subject,
        from: fromEmail,
        error: result.error.message,
        statusCode: (result.error as any).statusCode,
        name: result.error.name
      });
      return false;
    }

    console.log('[Email] Sent successfully:', { to, subject, from: fromEmail, id: result.data?.id });
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send:', {
      to,
      subject,
      error: error.message,
      name: error.name,
      statusCode: error.statusCode,
    });
    return false;
  }
}

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;

  if (!username || !apiKey) {
    console.error('[SMS] ClickSend credentials not configured');
    return false;
  }

  const phoneNumber = formatPhoneNumber(to);

  try {
    const response = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64'),
      },
      body: JSON.stringify({
        messages: [
          {
            source: 'ChipIn',
            body: message,
            to: phoneNumber,
          }
        ]
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.response_code === 'SUCCESS') {
      console.log('[SMS] Sent to', phoneNumber, result);
      return true;
    } else {
      console.error('[SMS] API error:', result);
      return false;
    }
  } catch (error: any) {
    console.error('[SMS] Failed to send:', error.message);
    return false;
  }
}

export async function sendPoolContributionNotification(
  recipientEmail: string,
  recipientPhone: string | null,
  recipientName: string,
  contributorName: string,
  poolId: string,
  poolTitle: string,
  amount: string,
  notifyEmail: boolean,
  notifySMS: boolean
) {
  const baseUrl = getBaseUrl();
  const promises: Promise<boolean>[] = [];

  if (notifyEmail && recipientEmail) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #d4ff00; margin: 0 0 16px;">New Contribution!</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            Hey ${recipientName},<br><br>
            <strong>${contributorName}</strong> just contributed <strong style="color: #d4ff00;">$${amount}</strong> to your pool "<strong>${poolTitle}</strong>"!
          </p>
          <a href="${baseUrl}/pool/${poolId}" 
             style="display: inline-block; background: #d4ff00; color: #0a1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Pool
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(recipientEmail, `💰 New contribution to ${poolTitle}!`, html));
  }

  if (notifySMS && recipientPhone) {
    const smsMessage = `ChipIn: ${contributorName} contributed $${amount} to your pool "${poolTitle}"!`;
    promises.push(sendSMS(recipientPhone, smsMessage));
  }

  await Promise.allSettled(promises);
}

export async function sendPoolCompletedNotification(
  recipientEmail: string,
  recipientPhone: string | null,
  recipientName: string,
  poolId: string,
  poolTitle: string,
  totalAmount: string,
  notifyEmail: boolean,
  notifySMS: boolean
) {
  const baseUrl = getBaseUrl();
  const promises: Promise<boolean>[] = [];

  if (notifyEmail && recipientEmail) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #d4ff00; margin: 0 0 16px;">🎉 Pool Complete!</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            Congratulations ${recipientName}!<br><br>
            Your pool "<strong>${poolTitle}</strong>" has reached its goal of <strong style="color: #d4ff00;">$${totalAmount}</strong>!
          </p>
          <a href="${baseUrl}/pool/${poolId}" 
             style="display: inline-block; background: #d4ff00; color: #0a1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Pool
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(recipientEmail, `🎉 Your pool "${poolTitle}" is complete!`, html));
  }

  if (notifySMS && recipientPhone) {
    const smsMessage = `ChipIn: Congrats! Your pool "${poolTitle}" reached $${totalAmount}! 🎉`;
    promises.push(sendSMS(recipientPhone, smsMessage));
  }

  await Promise.allSettled(promises);
}

export async function sendPoolInviteNotification(
  recipientEmail: string | null,
  recipientPhone: string | null,
  inviterName: string,
  poolId: string,
  poolTitle: string,
  useEmail: boolean,
  useSMS: boolean
) {
  const baseUrl = getBaseUrl();
  const poolLink = `${baseUrl}/pool/${poolId}`;
  const promises: Promise<boolean>[] = [];

  if (useEmail && recipientEmail) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #d4ff00; margin: 0 0 16px;">You're Invited!</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            <strong>${inviterName}</strong> invited you to chip in on "<strong>${poolTitle}</strong>"!
          </p>
          <a href="${poolLink}" 
             style="display: inline-block; background: #d4ff00; color: #0a1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Join Pool
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(recipientEmail, `${inviterName} invited you to chip in!`, html));
  }

  if (useSMS && recipientPhone) {
    const smsMessage = `${inviterName} invited you to chip in on "${poolTitle}"! Join here: ${poolLink}`;
    promises.push(sendSMS(recipientPhone, smsMessage));
  }

  await Promise.allSettled(promises);
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
        <h1 style="color: #d4ff00; margin: 0 0 16px;">Verify Your Email</h1>
        <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
          Your verification code is:
        </p>
        <div style="background: #0a1628; padding: 16px 32px; border-radius: 8px; display: inline-block;">
          <span style="color: #d4ff00; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #888; font-size: 14px; margin-top: 24px;">
          This code expires in 10 minutes.
        </p>
      </div>
      <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
        ChipIn - Pool funds together. Pay smarter.
      </p>
    </div>
  `;
  return sendEmail(email, 'Your ChipIn Verification Code', html);
}

export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
  return sendSMS(phone, `Your ChipIn verification code is: ${code}. Expires in 10 minutes.`);
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
        <h1 style="color: #d4ff00; margin: 0 0 16px;">Reset Your Password</h1>
        <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
          Click the button below to reset your password. This link expires in 30 minutes.
        </p>
        <a href="${resetLink}" style="background: #d4ff00; color: #0a1628; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 14px; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
        ChipIn - Pool funds together. Pay smarter.
      </p>
    </div>
  `;
  return sendEmail(email, 'Reset Your Password - ChipInPay', html);
}

export async function sendPasswordResetSMS(phone: string, resetLink: string): Promise<boolean> {
  return sendSMS(phone, `Reset your ChipInPay password: ${resetLink} (expires in 30 min)`);
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
        <h1 style="color: #d4ff00; margin: 0 0 16px;">Welcome to ChipIn! 🎉</h1>
        <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
          Hey ${name},<br><br>
          Thanks for joining ChipIn! You're now part of a community that makes group payments easy and fun.
        </p>
        <p style="color: #ccc; font-size: 14px; margin: 0 0 24px;">
          Here's what you can do:
        </p>
        <ul style="color: #ccc; font-size: 14px; margin: 0 0 24px; padding-left: 20px;">
          <li>Create pools for trips, gifts, events, or anything</li>
          <li>Invite friends to chip in via links, email, or SMS</li>
          <li>Track contributions in real-time</li>
          <li>Spend with virtual Visa cards</li>
        </ul>
        <a href="${baseUrl}/dashboard" 
           style="display: inline-block; background: #d4ff00; color: #0a1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Get Started
        </a>
      </div>
      <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
        ChipIn - Pool funds together. Pay smarter.
      </p>
    </div>
  `;
  return sendEmail(email, 'Welcome to ChipIn! 🎉', html);
}

// Security alert notifications
export async function sendSecurityAlertNotification(
  email: string,
  phone: string | null,
  name: string,
  alertType: 'login' | 'password_change' | '2fa_enabled' | '2fa_disabled' | 'new_device',
  details: string,
  notifyEmail: boolean,
  notifySMS: boolean
) {
  const alertTitles: Record<string, string> = {
    login: 'New Login Detected',
    password_change: 'Password Changed',
    '2fa_enabled': '2FA Enabled',
    '2fa_disabled': '2FA Disabled',
    new_device: 'New Device Login',
  };
  
  const promises: Promise<boolean>[] = [];

  if (notifyEmail && email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #ff6b6b; margin: 0 0 16px;">🔒 Security Alert</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            Hey ${name},<br><br>
            <strong>${alertTitles[alertType] || 'Security Update'}</strong><br><br>
            ${details}
          </p>
          <p style="color: #888; font-size: 14px;">
            If this wasn't you, please secure your account immediately.
          </p>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(email, `🔒 ${alertTitles[alertType] || 'Security Alert'} - ChipIn`, html));
  }

  if (notifySMS && phone) {
    promises.push(sendSMS(phone, `ChipIn Security: ${alertTitles[alertType]}. ${details}`));
  }

  await Promise.allSettled(promises);
}

// KYC status update notifications
export async function sendKycStatusNotification(
  email: string,
  phone: string | null,
  name: string,
  status: 'pending' | 'verified' | 'failed' | 'not_started',
  notifyEmail: boolean,
  notifySMS: boolean
) {
  const baseUrl = getBaseUrl();
  const statusMessages: Record<string, { title: string; message: string; emoji: string }> = {
    pending: { title: 'Verification In Progress', message: 'Your identity verification is being reviewed. This usually takes a few minutes.', emoji: '⏳' },
    verified: { title: 'Verification Complete!', message: 'Your identity has been verified. You now have full access to all ChipIn features!', emoji: '✅' },
    failed: { title: 'Verification Failed', message: 'Unfortunately, your verification was unsuccessful. Please try again or contact support.', emoji: '❌' },
    not_started: { title: 'Verification Required', message: 'Please complete identity verification to unlock all features.', emoji: '📋' },
  };

  const info = statusMessages[status] || statusMessages.pending;
  const promises: Promise<boolean>[] = [];

  if (notifyEmail && email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #d4ff00; margin: 0 0 16px;">${info.emoji} ${info.title}</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            Hey ${name},<br><br>
            ${info.message}
          </p>
          <a href="${baseUrl}/security" 
             style="display: inline-block; background: #d4ff00; color: #0a1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Status
          </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(email, `${info.emoji} ${info.title} - ChipIn`, html));
  }

  if (notifySMS && phone) {
    promises.push(sendSMS(phone, `ChipIn: ${info.emoji} ${info.title}. ${info.message}`));
  }

  await Promise.allSettled(promises);
}

// Card activity notifications
export async function sendCardActivityNotification(
  email: string,
  phone: string | null,
  name: string,
  activityType: 'transaction' | 'card_created' | 'card_frozen' | 'card_unfrozen',
  details: string,
  amount?: string,
  notifyEmail?: boolean,
  notifySMS?: boolean
) {
  const activityTitles: Record<string, { title: string; emoji: string }> = {
    transaction: { title: 'Card Transaction', emoji: '💳' },
    card_created: { title: 'Virtual Card Created', emoji: '✨' },
    card_frozen: { title: 'Card Frozen', emoji: '🧊' },
    card_unfrozen: { title: 'Card Unfrozen', emoji: '🔓' },
  };

  const info = activityTitles[activityType] || { title: 'Card Activity', emoji: '💳' };
  const promises: Promise<boolean>[] = [];

  if (notifyEmail && email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #d4ff00; margin: 0 0 16px;">${info.emoji} ${info.title}</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            Hey ${name},<br><br>
            ${details}
            ${amount ? `<br><br><strong style="color: #d4ff00; font-size: 24px;">$${amount}</strong>` : ''}
          </p>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(email, `${info.emoji} ${info.title} - ChipIn`, html));
  }

  if (notifySMS && phone) {
    const smsAmount = amount ? ` - $${amount}` : '';
    promises.push(sendSMS(phone, `ChipIn: ${info.emoji} ${info.title}${smsAmount}. ${details}`));
  }

  await Promise.allSettled(promises);
}

// Wallet activity notifications
export async function sendWalletActivityNotification(
  email: string,
  phone: string | null,
  name: string,
  activityType: 'deposit' | 'withdrawal' | 'transfer',
  amount: string,
  status: 'pending' | 'completed' | 'failed',
  notifyEmail: boolean,
  notifySMS: boolean
) {
  const activityTitles: Record<string, { title: string; emoji: string }> = {
    deposit: { title: 'Wallet Deposit', emoji: '💰' },
    withdrawal: { title: 'Wallet Withdrawal', emoji: '🏦' },
    transfer: { title: 'Wallet Transfer', emoji: '↔️' },
  };

  const statusText: Record<string, string> = {
    pending: 'is being processed',
    completed: 'has been completed',
    failed: 'has failed',
  };

  const info = activityTitles[activityType] || { title: 'Wallet Activity', emoji: '💰' };
  const promises: Promise<boolean>[] = [];

  if (notifyEmail && email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #d4ff00; margin: 0 0 16px;">${info.emoji} ${info.title}</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            Hey ${name},<br><br>
            Your ${activityType} of <strong style="color: #d4ff00;">$${amount}</strong> ${statusText[status] || 'is in progress'}.
          </p>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(email, `${info.emoji} ${info.title} - $${amount} - ChipIn`, html));
  }

  if (notifySMS && phone) {
    promises.push(sendSMS(phone, `ChipIn: ${info.emoji} Your ${activityType} of $${amount} ${statusText[status]}.`));
  }

  await Promise.allSettled(promises);
}

// Account changes notifications
export async function sendAccountChangeNotification(
  email: string,
  phone: string | null,
  name: string,
  changeType: 'email_updated' | 'phone_updated' | 'profile_updated' | 'bank_linked' | 'bank_unlinked',
  details: string,
  notifyEmail: boolean,
  notifySMS: boolean
) {
  const changeTitles: Record<string, { title: string; emoji: string }> = {
    email_updated: { title: 'Email Updated', emoji: '📧' },
    phone_updated: { title: 'Phone Updated', emoji: '📱' },
    profile_updated: { title: 'Profile Updated', emoji: '👤' },
    bank_linked: { title: 'Bank Account Linked', emoji: '🏦' },
    bank_unlinked: { title: 'Bank Account Unlinked', emoji: '🔗' },
  };

  const info = changeTitles[changeType] || { title: 'Account Updated', emoji: '⚙️' };
  const promises: Promise<boolean>[] = [];

  if (notifyEmail && email) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); padding: 32px; border-radius: 16px;">
          <h1 style="color: #d4ff00; margin: 0 0 16px;">${info.emoji} ${info.title}</h1>
          <p style="color: #ffffff; font-size: 16px; margin: 0 0 24px;">
            Hey ${name},<br><br>
            ${details}
          </p>
          <p style="color: #888; font-size: 14px;">
            If you didn't make this change, please contact support immediately.
          </p>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
          ChipIn - Pool funds together. Pay smarter.
        </p>
      </div>
    `;
    promises.push(sendEmail(email, `${info.emoji} ${info.title} - ChipIn`, html));
  }

  if (notifySMS && phone) {
    promises.push(sendSMS(phone, `ChipIn: ${info.emoji} ${info.title}. ${details}`));
  }

  await Promise.allSettled(promises);
}
