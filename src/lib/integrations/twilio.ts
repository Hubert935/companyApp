import twilio from 'twilio'

export interface TwilioCreds {
  accountSid: string
  authToken: string
  fromNumber: string
}

export function getTwilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken)
}

export async function sendSMS(
  creds: TwilioCreds,
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTwilioClient(creds.accountSid, creds.authToken)
    await client.messages.create({ from: creds.fromNumber, to, body })
    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown Twilio error',
    }
  }
}
