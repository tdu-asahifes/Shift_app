import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateToken, COOKIE_NAME } from '@/lib/adminAuth';

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 });
  }

  const token = generateToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/admin',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24時間
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
