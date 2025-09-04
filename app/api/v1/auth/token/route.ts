import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@company.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Demo-only auth; replace with DB lookup + bcrypt compare
    if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = sign(
      { userId: 'demo-user', email },
      process.env.NEXTAUTH_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );

    return NextResponse.json({ success: true, token });
  } catch (err) {
    return NextResponse.json(
      { error: 'Auth failed' },
      { status: 500 }
    );
  }
}