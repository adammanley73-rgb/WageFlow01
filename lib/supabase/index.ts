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

export async function createClient() {
  if (typeof window !== 'undefined') {
    const { createBrowserClient } = require('@supabase/ssr')
    return createBrowserClient(URL, ANON)
  }

  const { cookies } = require('next/headers')
  const { createServerClient } = require('@supabase/ssr')
  const cookieStore = await cookies()

  return createServerClient(URL, ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export function createBrowserClient() {
  const { createBrowserClient } = require('@supabase/ssr')
  return createBrowserClient(URL, ANON)
}

export async function createServerClient() {
  const { cookies } = require('next/headers')
  const { createServerClient } = require('@supabase/ssr')
  const cookieStore = await cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}