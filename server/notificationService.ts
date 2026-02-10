// Notification Service - Uses Resend for email and ClickSend for SMS
// Reference: Resend integration connection:conn_resend_01KF2682PY53SZZBAFJ7HQKGNX

import { Resend } from 'resend';
import { emailWrapper, emailHeading, emailText, emailHighlight, emailButton, emailInfoCard, emailDivider, emailAlert, emailVerificationCode, emailFeatureList, getBaseUrl as getTemplateBaseUrl } from './emailTemplates';

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
    const html = emailWrapper({
      body: [
        emailHeading('New Contribution!'),
        emailText(`Hey ${recipientName},`),
        emailText(`<strong>${contributorName}</strong> just contributed to your pool "<strong>${poolTitle}</strong>"!`),
        emailHighlight(`$${amount}`, 'Contribution Amount'),
        emailButton('View Pool', `${baseUrl}/pool/${poolId}`),
      ].join(''),
      preheaderText: `${contributorName} contributed $${amount} to ${poolTitle}`,
    });
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
    const html = emailWrapper({
      body: [
        emailHeading('Pool Complete!'),
        emailText(`Congratulations ${recipientName}!`),
        emailText(`Your pool "<strong>${poolTitle}</strong>" has reached its goal!`),
        emailHighlight(`$${totalAmount}`, 'Goal Reached'),
        emailAlert('All funds have been collected and are ready to use.', 'success'),
        emailButton('View Pool', `${baseUrl}/pool/${poolId}`),
      ].join(''),
      preheaderText: `Your pool "${poolTitle}" reached $${totalAmount}!`,
    });
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
    const html = emailWrapper({
      body: [
        emailHeading("You're Invited!"),
        emailText(`<strong>${inviterName}</strong> invited you to chip in on "<strong>${poolTitle}</strong>"!`),
        emailText('ChipIn makes it easy to pool funds together with friends for trips, gifts, events, and more.'),
        emailButton('Join Pool', poolLink),
      ].join(''),
      preheaderText: `${inviterName} invited you to chip in on "${poolTitle}"`,
    });
    promises.push(sendEmail(recipientEmail, `${inviterName} invited you to chip in!`, html));
  }

  if (useSMS && recipientPhone) {
    const smsMessage = `${inviterName} invited you to chip in on "${poolTitle}"! Join here: ${poolLink}`;
    promises.push(sendSMS(recipientPhone, smsMessage));
  }

  await Promise.allSettled(promises);
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const html = emailWrapper({
    body: [
      emailHeading('Verify Your Email'),
      emailText('Enter the code below to verify your email address:'),
      emailVerificationCode(code),
      emailText('This code expires in <strong>10 minutes</strong>.', { muted: true, small: true }),
      emailDivider(),
      emailText("If you didn't request this code, you can safely ignore this email.", { muted: true, small: true }),
    ].join(''),
    preheaderText: `Your verification code is ${code}`,
  });
  return sendEmail(email, 'Your ChipIn Verification Code', html);
}

export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
  return sendSMS(phone, `Your ChipIn verification code is: ${code}. Expires in 10 minutes.`);
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
  const html = emailWrapper({
    body: [
      emailHeading('Reset Your Password'),
      emailText('We received a request to reset your password. Click the button below to set a new password.'),
      emailButton('Reset Password', resetLink),
      emailText('This link expires in <strong>30 minutes</strong>.', { muted: true, small: true }),
      emailDivider(),
      emailText("If you didn't request this, you can safely ignore this email. Your password will remain unchanged.", { muted: true, small: true }),
    ].join(''),
    preheaderText: 'Reset your ChipIn password',
  });
  return sendEmail(email, 'Reset Your Password - ChipInPay', html);
}

export async function sendPasswordResetSMS(phone: string, resetLink: string): Promise<boolean> {
  return sendSMS(phone, `Reset your ChipInPay password: ${resetLink} (expires in 30 min)`);
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const baseUrl = getBaseUrl();
  const html = emailWrapper({
    body: [
      emailHeading('Welcome to ChipIn!'),
      emailText(`Hey ${name},`),
      emailText("Thanks for joining ChipIn! You're now part of a community that makes group payments easy and fun."),
      emailText("Here's what you can do:"),
      emailFeatureList([
        'Create pools for trips, gifts, events, or anything',
        'Invite friends to chip in via links, email, or SMS',
        'Track contributions in real-time',
        'Spend with virtual Visa cards',
      ]),
      emailButton('Get Started', `${baseUrl}/dashboard`),
    ].join(''),
    preheaderText: `Welcome to ChipIn, ${name}! Start pooling funds with friends.`,
  });
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
    const html = emailWrapper({
      body: [
        emailHeading('Security Alert'),
        emailAlert(`<strong>${alertTitles[alertType] || 'Security Update'}</strong>`, 'warning'),
        emailText(`Hey ${name},`),
        emailText(details),
        emailDivider(),
        emailText("If this wasn't you, please secure your account immediately by changing your password.", { muted: true, small: true }),
      ].join(''),
      preheaderText: `Security Alert: ${alertTitles[alertType]}`,
    });
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
    const alertType = status === 'verified' ? 'success' : status === 'failed' ? 'error' : 'info';
    const html = emailWrapper({
      body: [
        emailHeading(`${info.emoji} ${info.title}`),
        emailText(`Hey ${name},`),
        emailAlert(info.message, alertType as any),
        emailButton('View Status', `${baseUrl}/security`),
      ].join(''),
      preheaderText: `${info.title}`,
    });
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
    const html = emailWrapper({
      body: [
        emailHeading(`${info.emoji} ${info.title}`),
        emailText(`Hey ${name},`),
        emailText(details),
        ...(amount ? [emailHighlight(`$${amount}`, 'Transaction Amount')] : []),
      ].join(''),
      preheaderText: `${info.title}${amount ? ` - $${amount}` : ''}`,
    });
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
    const html = emailWrapper({
      body: [
        emailHeading(`${info.emoji} ${info.title}`),
        emailText(`Hey ${name},`),
        emailText(`Your ${activityType} of <strong>$${amount}</strong> ${statusText[status] || 'is in progress'}.`),
        emailHighlight(`$${amount}`, info.title),
      ].join(''),
      preheaderText: `${info.title}: $${amount} ${statusText[status]}`,
    });
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
    const html = emailWrapper({
      body: [
        emailHeading(`${info.emoji} ${info.title}`),
        emailText(`Hey ${name},`),
        emailText(details),
        emailDivider(),
        emailText("If you didn't make this change, please contact support immediately.", { muted: true, small: true }),
      ].join(''),
      preheaderText: `${info.title}: ${details}`,
    });
    promises.push(sendEmail(email, `${info.emoji} ${info.title} - ChipIn`, html));
  }

  if (notifySMS && phone) {
    promises.push(sendSMS(phone, `ChipIn: ${info.emoji} ${info.title}. ${details}`));
  }

  await Promise.allSettled(promises);
}
