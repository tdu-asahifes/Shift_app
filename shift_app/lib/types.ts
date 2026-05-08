// ログインユーザー
export interface LoginUser {
  studentId: string;
  name: string;
  loginDate: string; // YYYY-MM-DD
}

// シフト
export interface Shift {
  date: string;
  time: string; // "10:00-13:00"
  startTime: string; // "10:00"
  endTime: string; // "13:00"
  name: string;
  studentId: string;
  locationId: string;
  locationName: string;
  role: string;
  notice: string;
}

// 打刻レコード
export interface AttendanceRecord {
  id: string;
  studentId: string;
  locationId: string;
  locationName: string;
  checkInAt: string;
  checkOutAt: string | null;
  date: string;
}

// 場所
export interface Location {
  locationId: string;
  locationName: string;
  color?: string;
  category?: string;
}

// メンバー出勤状況
export interface MemberStatus {
  studentId: string;
  name: string;
  shiftTime: string;
  status: 'working' | 'left' | 'not_yet';
  checkInAt: string | null;
  previousLocation: string | null;
  previousTime: string | null;
}
