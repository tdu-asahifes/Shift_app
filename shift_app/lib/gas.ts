import { Shift, AttendanceRecord, MemberStatus, Location } from './types';

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || '';

async function gasFetch<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('_t', Date.now().toString());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

async function gasPost<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data;
}

export const api = {
  /** ログイン認証 */
  login: (studentId: string, code: string) =>
    gasPost<{ name: string }>('login', { studentId, code }),

  /** 場所一覧取得 */
  getLocations: () =>
    gasFetch<Location[]>('getLocations'),

  /** 自分のシフト取得 */
  getMyShifts: (studentId: string, date: string) =>
    gasFetch<Shift[]>('getMyShifts', { studentId, date }),

  /** 場所別シフト取得 */
  getShiftsByLocation: (locationId: string, date: string) =>
    gasFetch<Shift[]>('getShiftsByLocation', { locationId, date }),

  /** 出勤打刻（自動退勤処理込み） */
  checkIn: (studentId: string, locationId: string) =>
    gasPost<{ success: boolean }>('checkIn', { studentId, locationId }),

  /** 迷子ログ保存 */
  saveLostLog: (studentId: string, locationId: string) =>
    gasPost<{ success: boolean }>('saveLostLog', { studentId, locationId }),

  /** 自分の打刻履歴 */
  getMyAttendance: (studentId: string, date: string) =>
    gasFetch<AttendanceRecord[]>('getMyAttendance', { studentId, date }),

  /** 場所のメンバー出勤状況 */
  getMemberStatus: (locationId: string, date: string) =>
    gasFetch<MemberStatus[]>('getMemberStatus', { locationId, date }),
};
