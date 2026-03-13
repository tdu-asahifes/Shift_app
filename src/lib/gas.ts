const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || '';

async function gasGet(action: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams({ action, _t: Date.now().toString(), ...params }).toString();
  const r = await fetch(`${GAS_URL}?${q}`, { cache: 'no-store' });
  return r.json();
}

async function gasPost(action: string, body: Record<string, unknown> = {}) {
  const r = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...body }),
  });
  return r.json();
}

export type TargetMode = 'all' | 'section' | 'role' | 'individual';
export type UserRole   = 'individual' | 'leader' | 'manager' | 'hq';

export const api = {
  ping:             ()                                       => gasGet('ping'),
  login:            (studentId: string, password: string)    => gasPost('login', { studentId, password }),
  getStaff:         ()                                       => gasGet('getStaff'),
  getAttendance:    ()                                       => gasGet('getAttendance'),
  getKeyStatus:     ()                                       => gasGet('getKeyStatus'),
  getNotifications: (since?: string)                         => gasGet('getNotifications', since ? { since } : {}),
  getMyShifts:      (staffId: string)                        => gasGet('getMyShifts', { staffId }),
  checkIn:          (staffId: string, boothId: string)       => gasPost('checkIn', { staffId, boothId }),
  checkOut:         (staffId: string)                        => gasPost('checkOut', { staffId }),
  borrowKey:        (keyId: string, keyName: string, staffId: string) => gasPost('borrowKey', { keyId, keyName, staffId }),
  returnKey:        (keyId: string)                          => gasPost('returnKey', { keyId }),
  savePushSub:      (staffId: string, sub: PushSubscriptionJSON)      => gasPost('savePushSub', { staffId, subscription: sub }),
  sendNotification: (
    targetMode: TargetMode,
    targets: string[],
    message: string,
    title?: string,
    urgent?: boolean,
  ) => gasPost('sendNotification', { targetMode, targets, message, title, urgent: !!urgent }),
};