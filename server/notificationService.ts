// Notification Service - Uses Resend for email and ClickSend for SMS
// Reference: Resend integration connection:conn_resend_01KF2682PY53SZZBAFJ7HQKGNX

import { Resend } from 'resend';

interface NotificationSettings {
  apiKey: string;
  fromEmail: string;
}

let connectionSettings: any;

async function getResendCredentials(): Promise<NotificationSettings> {
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
  return process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : process.env.REPLIT_DOMAINS?.split(',')[0] 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
    : 'https://chipin.app';
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
    
    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    console.log('[Email] Sent to', to, result);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send:', error.message);
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
