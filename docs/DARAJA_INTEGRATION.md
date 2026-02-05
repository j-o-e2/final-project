# Daraja (M-Pesa) Integration Guide

This document explains how to wire Safaricom Daraja (STK Push) into this app. The repo contains helper scaffolding so you can plug Daraja in with minimal changes.

Files added:
- `lib/daraja.ts` - helpers: `getDarajaAccessToken()` and `initiateStkPush()` and `parseDarajaCallback()`.
- `app/api/payments/daraja/callback/route.ts` - webhook route to receive STK callback and update `payments` + `user_wallets`.
- `.env.example` - Daraja environment variables placeholders.
- `lib/payment-utils.ts` - `recordExternalPaymentPending()` helper to create a pending payment record before an STK push.

Environment variables (set these in your deployment or local .env):
- `DAR_AJA_ENV` - `sandbox` or `production`
- `DAR_AJA_CONSUMER_KEY` - Daraja consumer key
- `DAR_AJA_CONSUMER_SECRET` - Daraja consumer secret
- `DAR_AJA_SHORTCODE` - Business short code
- `DAR_AJA_PASSKEY` - Passkey for STK
- `DAR_AJA_CALLBACK_URL` - Public callback URL: `https://your-domain/api/payments/daraja/callback`

Supabase requirements:
- `SUPABASE_SERVICE_ROLE_KEY` must be set on server runtime to allow the webhook to update `payments` and `user_wallets`.
- `payments` table should include columns: `external_reference` (string), `raw_callback` (jsonb) — if you don't have these, add them.

Recommended wiring patterns

1) Wallet top-up (recommended):
- Client initiates a top-up by calling an API endpoint which:
  - calls `recordExternalPaymentPending(userId, 'wallet_topup', amount, { external_reference: checkoutId })` to create a pending record
  - calls `initiateStkPush(phoneNumber, amount, accountRef, 'Topup', callbackUrl)`
- When Daraja calls your webhook, `app/api/payments/daraja/callback` will mark the payment as `completed` and credit the user's `user_wallets.balance`.

2) Immediate charge during approval (alternate):
- If you want to charge via STK push when the job is accepted, you can either:
  - Accept the application *only after* STK push completes successfully (preferred for correctness). Flow: create pending payment -> STK push -> when webhook confirms, update application status to `accepted` and set `client_contact_revealed = true`.
  - Or (less recommended) accept first then attempt STK push and revert on failure (current code does this); change to charge-first if you want no inconsistent states.

Security and testing
- In development, use `ngrok` or a publicly reachable URL and set `DAR_AJA_CALLBACK_URL` to `https://<your-ngrok>.ngrok.io/api/payments/daraja/callback` and configure that URL in Daraja dashboard (sandbox credentials). Daraja sandbox also sends callbacks to your callback URL.
- Verify requests to the webhook come from Daraja (IP allowlist or secret if you implement one). The default sandbox does not sign callbacks.
- Store `SUPABASE_SERVICE_ROLE_KEY` securely (do not expose it to the client).

Next steps
- Add an API route to start an STK push (server-side) which calls `recordExternalPaymentPending` then `initiateStkPush`, returns the Daraja response to the client.
- Optionally implement idempotent matching on `external_reference` or `CheckoutRequestID` to make retries safe.
- Consider moving payment wallet updates into a Postgres function (transactional) to avoid race conditions.

If you'd like, I can also:
- Add the API route to initiate an STK push from server-side.
- Add DB migrations to add `external_reference` and `raw_callback` columns to `payments` if missing.
- Convert the accept+charge flow to "charge-first" and make it atomic with DB-side transaction.
