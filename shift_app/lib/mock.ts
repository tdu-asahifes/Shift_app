import { Shift, AttendanceRecord, MemberStatus, Location } from './types';

const today = new Date().toISOString().split('T')[0];

const LOCATIONS: Location[] = [
  { locationId: 'uketsuke', locationName: '受付' },
  { locationId: 'stage', locationName: 'ステージ' },
  { locationId: 'food', locationName: 'フードコート' },
  { locationId: 'parking', locationName: '駐車場' },
];

const MOCK_USERS: Record<string, string> = {
  '12345678': '山田 太郎',
  '23456789': '佐藤 花子',
  '34567890': '鈴木 一郎',
  '45678901': '田中 美咲',
};

const MOCK_SHIFTS: Shift[] = [
  { date: today, time: '9:00-12:00', startTime: '09:00', endTime: '12:00', name: '山田 太郎', studentId: '12345678', locationId: 'uketsuke', locationName: '受付', notice: '来場者リストを確認してください' },
  { date: today, time: '13:00-16:00', startTime: '13:00', endTime: '16:00', name: '山田 太郎', studentId: '12345678', locationId: 'stage', locationName: 'ステージ', notice: '' },
  { date: today, time: '9:00-12:00', startTime: '09:00', endTime: '12:00', name: '佐藤 花子', studentId: '23456789', locationId: 'uketsuke', locationName: '受付', notice: '' },
  { date: today, time: '12:00-15:00', startTime: '12:00', endTime: '15:00', name: '鈴木 一郎', studentId: '34567890', locationId: 'uketsuke', locationName: '受付', notice: '' },
  { date: today, time: '10:00-14:00', startTime: '10:00', endTime: '14:00', name: '田中 美咲', studentId: '45678901', locationId: 'stage', locationName: 'ステージ', notice: 'マイクテスト14時から' },
];

// メモリ上の打刻データ
const attendanceRecords: AttendanceRecord[] = [];
let idCounter = 1;

export const mockApi = {
  login: async (studentId: string, code: string): Promise<{ name: string }> => {
    await delay(300);
    if (code !== '1234') throw new Error('ログインコードが違います');
    const name = MOCK_USERS[studentId];
    if (!name) throw new Error('この学籍番号は本日のシフトに登録されていません');
    return { name };
  },

  getLocations: async (): Promise<Location[]> => {
    await delay(100);
    return LOCATIONS;
  },

  getMyShifts: async (studentId: string): Promise<Shift[]> => {
    await delay(200);
    return MOCK_SHIFTS.filter(s => s.studentId === studentId);
  },

  getShiftsByLocation: async (locationId: string): Promise<Shift[]> => {
    await delay(200);
    return MOCK_SHIFTS.filter(s => s.locationId === locationId);
  },

  checkIn: async (studentId: string, locationId: string): Promise<{ success: boolean }> => {
    await delay(300);
    // 同じ場所に既に出勤中なら無視
    const existing = attendanceRecords.find(
      r => r.studentId === studentId && r.locationId === locationId && r.date === today && !r.checkOutAt
    );
    if (existing) throw new Error('already checked in');

    // 別の場所で出勤中なら自動退勤
    const prev = attendanceRecords.find(
      r => r.studentId === studentId && r.date === today && !r.checkOutAt
    );
    if (prev) {
      prev.checkOutAt = new Date().toISOString();
    }

    const loc = LOCATIONS.find(l => l.locationId === locationId);
    attendanceRecords.push({
      id: String(idCounter++),
      studentId,
      locationId,
      locationName: loc?.locationName || locationId,
      checkInAt: new Date().toISOString(),
      checkOutAt: null,
      date: today,
    });
    return { success: true };
  },

  saveLostLog: async (): Promise<{ success: boolean }> => {
    await delay(100);
    return { success: true };
  },

  getMyAttendance: async (studentId: string): Promise<AttendanceRecord[]> => {
    await delay(200);
    return attendanceRecords.filter(r => r.studentId === studentId && r.date === today);
  },

  getMemberStatus: async (locationId: string): Promise<MemberStatus[]> => {
    await delay(200);
    const locationShifts = MOCK_SHIFTS.filter(s => s.locationId === locationId);
    return locationShifts.map(s => {
      const rec = attendanceRecords.find(
        r => r.studentId === s.studentId && r.locationId === locationId && r.date === today
      );
      let status: MemberStatus['status'] = 'not_yet';
      if (rec && !rec.checkOutAt) status = 'working';
      else if (rec && rec.checkOutAt) status = 'left';

      // 直前の勤務
      const prevRec = attendanceRecords.find(
        r => r.studentId === s.studentId && r.locationId !== locationId && r.date === today && r.checkOutAt
      );

      return {
        studentId: s.studentId,
        name: s.name,
        shiftTime: s.time,
        status,
        checkInAt: rec ? new Date(rec.checkInAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null,
        previousLocation: prevRec ? prevRec.locationName : null,
        previousTime: prevRec
          ? `${new Date(prevRec.checkInAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜${new Date(prevRec.checkOutAt!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
          : null,
      };
    });
  },
};

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
