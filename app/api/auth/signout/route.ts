import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // In a real app, you'd invalidate the session on the server
    // For now, we'll handle client-side logout
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}