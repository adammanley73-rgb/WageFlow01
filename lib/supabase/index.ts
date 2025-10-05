// lib/supabase/index.ts
/* @ts-nocheck */
/*
  One function: createClient()
  - In the browser, returns a browser Supabase client.
  - On the server, returns a server Supabase client wired to read cookies.
  Also exports named helpers if you ever want to be explicit:
    - createBrowserClient()
    - createServerClient()
*/

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  if (typeof window !== 'undefined') {
    // Browser side
    const { createBrowserClient } = require('@supabase/ssr')
    return createBrowserClient(URL, ANON)
  }

  // Server side
  const { cookies } = require('next/headers')
  const { createServerClient } = require('@supabase/ssr')
  const cookieStore = cookies()

  return createServerClient(URL, ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

// Optional explicit exports (useful if you want to force one side)
export function createBrowserClient() {
  const { createBrowserClient } = require('@supabase/ssr')
  return createBrowserClient(URL, ANON)
}

export function createServerClient() {
  const { cookies } = require('next/headers')
  const { createServerClient } = require('@supabase/ssr')
  const cookieStore = cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}
