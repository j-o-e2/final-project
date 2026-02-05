// lib/daraja.ts
// Lightweight helpers to integrate with Safaricom Daraja (M-Pesa) STK Push

const DAR_AJA_ENV = (process.env.DAR_AJA_ENV || 'sandbox').toLowerCase()
const CONSUMER_KEY = process.env.DAR_AJA_CONSUMER_KEY || ''
const CONSUMER_SECRET = process.env.DAR_AJA_CONSUMER_SECRET || ''
const SHORTCODE = process.env.DAR_AJA_SHORTCODE || ''
const PASSKEY = process.env.DAR_AJA_PASSKEY || ''
const CALLBACK_URL = process.env.DAR_AJA_CALLBACK_URL || ''

function baseUrl() {
  return DAR_AJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
}

export interface StkPushResponse {
  checkoutRequestID?: string
  merchantRequestID?: string
  responseCode?: string
  responseDescription?: string
  error?: string
}

export async function getDarajaAccessToken(): Promise<{ success: boolean; accessToken?: string; expires?: number; error?: string }> {
  try {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) return { success: false, error: 'Missing Daraja consumer credentials' }
    const url = `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`
    const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${token}`,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Failed to fetch token: ${res.status} ${text}` }
    }

    const body = await res.json()
    return { success: true, accessToken: body.access_token, expires: body.expires_in }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { success: false, error: message }
  }
}

export async function initiateStkPush(
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDesc: string,
  callbackUrl: string = CALLBACK_URL,
): Promise<StkPushResponse> {
  try {
    if (!PASSKEY || !SHORTCODE) return { error: 'Missing shortcode or passkey' }
    const tokenRes = await getDarajaAccessToken()
    if (!tokenRes.success || !tokenRes.accessToken) return { error: tokenRes.error || 'No token' }

    const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0,14) // YYYYMMDDhhmmss
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64')

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phoneNumber.replace(/^\+/, ''), // e.g. 2547XXXXXXXX
      PartyB: SHORTCODE,
      PhoneNumber: phoneNumber.replace(/^\+/, ''),
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    }

    const url = `${baseUrl()}/mpesa/stkpush/v1/processrequest`
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${tokenRes.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const json = await res.json().catch(() => ({ error: `Non-JSON response: ${res.status}` }))

    if (!res.ok) {
      return { error: `Daraja responded with ${res.status}`, responseDescription: (json as any)?.errorMessage || (json as any)?.error || JSON.stringify(json) }
    }

    // Expected sandbox response includes CheckoutRequestID and ResponseCode === '0' for success
    return {
      checkoutRequestID: (json as any)?.CheckoutRequestID || (json as any)?.checkoutRequestID,
      merchantRequestID: (json as any)?.MerchantRequestID || (json as any)?.merchantRequestID,
      responseCode: (json as any)?.ResponseCode || (json as any)?.responseCode,
      responseDescription: (json as any)?.ResponseDescription || (json as any)?.responseDescription,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: message }
  }
}

// NOTE: Daraja callback verification depends on whether you have any signing mechanism.
// The default MPesa Daraja webhook does not include an HMAC signature by default for the STK push;
// instead you must validate the payload structure and the ResultCode.
// Implement any required verification here if your environment adds a signature header.

export type DarajaParsedStk = {
  resultCode: any
  resultDesc: any
  metadata: any
  raw: any
}

export type DarajaParseResult = DarajaParsedStk | { type: string; raw: any; error?: string }

export function isStkParsed(obj: any): obj is DarajaParsedStk {
  return obj && typeof obj.resultCode !== 'undefined' && typeof obj.raw !== 'undefined'
}

export function parseDarajaCallback(body: any): DarajaParseResult {
  // The STK push callback typically has structure: Body.stkCallback with ResultCode and CallbackMetadata
  try {
    const stk = body?.Body?.stkCallback || body?.stkCallback || null
    if (!stk) return { type: 'unknown', raw: body }
    const resultCode = stk?.ResultCode
    const resultDesc = stk?.ResultDesc
    const metadata = stk?.CallbackMetadata || null

    const parsed: DarajaParsedStk = {
      resultCode,
      resultDesc,
      metadata,
      raw: stk,
    }
    return parsed
  } catch (err) {
    return { type: 'parse_error', error: err instanceof Error ? err.message : String(err), raw: body }
  }
}
