// ClickSend SMS client integration
// Using ClickSend API for SMS delivery

const CLICKSEND_API_URL = 'https://rest.clicksend.com/v3/sms/send';

export async function sendPoolInviteSMS(
  to: string,
  inviterName: string,
  poolTitle: string,
  poolUrl: string
): Promise<boolean> {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;
  
  if (!username || !apiKey) {
    console.error('ClickSend credentials not configured');
    return false;
  }

  // Format phone number (ensure it has country code)
  let phoneNumber = to.replace(/\D/g, '');
  if (!phoneNumber.startsWith('1') && phoneNumber.length === 10) {
    phoneNumber = '1' + phoneNumber; // Add US country code
  }
  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+' + phoneNumber;
  }

  const message = `${inviterName} invited you to chip in for "${poolTitle}"! Join here: ${poolUrl}`;

  try {
    const response = await fetch(CLICKSEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${username}:${apiKey}`).toString('base64'),
      },
      body: JSON.stringify({
        messages: [
          {
            source: 'chipin',
            body: message,
            to: phoneNumber,
          }
        ]
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.response_code === 'SUCCESS') {
      console.log(`SMS invite sent to ${phoneNumber} for pool "${poolTitle}"`);
      return true;
    } else {
      console.error('ClickSend API error:', result);
      return false;
    }
  } catch (error: any) {
    console.error('Failed to send SMS invite:', error.message);
    return false;
  }
}
