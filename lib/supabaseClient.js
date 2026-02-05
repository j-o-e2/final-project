import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Helper to create a thenable that resolves to an error-shaped result
function makeErrorResult(message) {
  const result = { data: null, error: { message } }
  const p = Promise.resolve(result)
  // allow chaining methods like .eq(), .maybeSingle(), .order(), .limit()
  p.eq = () => p
  p.maybeSingle = () => p
  p.order = () => p
  p.limit = () => p
  p.select = () => p
  p.insert = () => p
  p.update = () => p
  p.delete = () => p
  p.upsert = () => p
  return p
}

let supabase

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} else {
  // Defensive stub to avoid raw NetworkError in the browser when public envs are missing
  const msg = 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (client disabled)'
  // Minimal stub matching the parts of the supabase client used by the app
  supabase = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: msg } }),
      getSession: async () => ({ data: { session: null }, error: { message: msg } }),
      signOut: async () => ({ error: { message: msg } }),
    },
    from: (_table) => makeErrorResult(msg),
    // provide a catch-all rpc/function surface
    rpc: () => makeErrorResult(msg),
  }
  // warn once in dev
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('[lib/supabaseClient] Public Supabase env vars missing — returning defensive stub.')
  }
}

export { supabase }

export const createClient = () =>
  createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
