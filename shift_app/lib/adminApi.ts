import { Location, MemberStatus } from './types';

export interface AdminShift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  studentId: string;
  locationId: string;
  locationName: string;
  department: string;
  role: string;
  notice: string;
}

export interface DailyCode {
  date: string;
  code: string;
}

export interface LostLog {
  id: number;
  studentId: string;
  scannedLocationId: string;
  scannedLocationName: string;
  scannedAt: string;
  date: string;
}

export interface LocationAttendance {
  locationId: string;
  locationName: string;
  category: string;
  members: MemberStatus[];
  summary: { working: number; left: number; notYet: number; total: number };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

export const adminApi = {
  // 認証
  async login(password: string): Promise<void> {
    await request('auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async logout(): Promise<void> {
    await request('auth', { method: 'DELETE' });
  },

  // シフト
  async getShifts(date: string): Promise<AdminShift[]> {
    return request(`shifts?date=${date}`);
  },

  async createShift(data: Omit<AdminShift, 'id' | 'locationName'>): Promise<void> {
    await request('shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createShiftsBulk(data: Omit<AdminShift, 'id' | 'locationName'>[]): Promise<void> {
    await request('shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateShift(id: number, data: Partial<AdminShift>): Promise<void> {
    await request(`shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteShift(id: number): Promise<void> {
    await request(`shifts/${id}`, { method: 'DELETE' });
  },

  // 出勤状況
  async getAttendanceDashboard(date: string): Promise<LocationAttendance[]> {
    return request(`attendance?date=${date}`);
  },

  // 場所
  async getLocations(): Promise<Location[]> {
    return request('locations');
  },

  async createLocation(locationId: string, locationName: string, color?: string, category?: string): Promise<void> {
    await request('locations', {
      method: 'POST',
      body: JSON.stringify({ locationId, locationName, color, category }),
    });
  },

  async updateLocation(id: string, data: { locationName?: string; color?: string; category?: string }): Promise<void> {
    await request(`locations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteLocation(id: string): Promise<void> {
    await request(`locations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // 当日コード
  async getDailyCodes(): Promise<DailyCode[]> {
    return request('daily-codes');
  },

  async upsertDailyCode(date: string, code: string): Promise<void> {
    await request('daily-codes', {
      method: 'POST',
      body: JSON.stringify({ date, code }),
    });
  },

  // QRコード
  async getQrCodes(baseUrl: string): Promise<{ locationId: string; locationName: string; url: string; qrDataUrl: string }[]> {
    return request(`qr-codes?baseUrl=${encodeURIComponent(baseUrl)}`);
  },

  // 迷子ログ
  async getLostLogs(date?: string): Promise<LostLog[]> {
    const query = date ? `?date=${date}` : '';
    return request(`lost-logs${query}`);
  },
};
