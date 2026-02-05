import type { SupabaseClient } from '@supabase/supabase-js'

// Provide a lightweight declaration so TypeScript knows the shape of the client
// This avoids many implicit-any diagnostics in client code that imports `supabase`
declare const supabase: SupabaseClient<any, any, any>

export { supabase }

export declare const createClient: (...args: any[]) => SupabaseClient<any, any, any>
