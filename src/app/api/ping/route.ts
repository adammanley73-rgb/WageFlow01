﻿import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET() { return NextResponse.json({ ok: true, ping: 'pong', time: new Date().toISOString() }); }
