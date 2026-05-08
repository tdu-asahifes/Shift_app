import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

const COOKIE_NAME = 'admin_token';

// ADMIN_PASSWORDを鍵にして署名を生成・検証する
function sign(value: string): string {
  const secret = process.env.ADMIN_PASSWORD || '';
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function generateToken(): string {
  const payload = `admin:${Date.now()}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): boolean {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  return sign(payload) === signature;
}

export async function verifyAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  return null;
}

export { COOKIE_NAME };
