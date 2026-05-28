import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://nzzaspeqnardonydimzn.supabase.co'
const fallbackAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56emFzcGVxbmFyZG9ueWRpbXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzI5NjYsImV4cCI6MjA5Mzc0ODk2Nn0.h0VjwKbLYAOSxRUmpKIwX6Lg8q6SvuaYX2jnCW7tV1k'

function getServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? fallbackAnonKey
}

export function getServerSupabase() {
  return createClient(supabaseUrl, getServerKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
