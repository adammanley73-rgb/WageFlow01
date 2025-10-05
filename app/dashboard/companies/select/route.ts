/* @ts-nocheck */
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const form = await req.formData()
  const company_id = String(form.get('company_id') || '')
  if (!company_id) {
    return NextResponse.redirect(new URL('/dashboard/companies', req.url))
  }

  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  // cookie for 30 days, strict-ish
  res.cookies.set('company_id', company_id, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
