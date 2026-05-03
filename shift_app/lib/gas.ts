import { supabase } from './supabase';
import { Shift, AttendanceRecord, MemberStatus, Location } from './types';
import { getToday } from './session';

export const api = {
  /** ログイン認証 */
  async login(studentId: string, code: string): Promise<{ name: string }> {
    // 学籍番号を小文字に正規化（DB側が小文字の場合に対応）
    studentId = studentId.toLowerCase();
    // 当日コード照合
    const today = getToday();
    const { data: codeRow, error: codeErr } = await supabase
      .from('daily_codes')
      .select('code')
      .eq('date', today)
      .single();
    if (codeErr || !codeRow) throw new Error('本日のログインコードが設定されていません');
    if (codeRow.code !== code) throw new Error('ログインコードが違います');

    // 学籍番号がシフトに存在するか確認
    const { data: shift, error: shiftErr } = await supabase
      .from('shifts')
      .select('name')
      .eq('student_id', studentId)
      .eq('date', today)
      .limit(1)
      .single();
    if (shiftErr || !shift) throw new Error('この学籍番号は本日のシフトに登録されていません');

    return { name: shift.name };
  },

  /** 場所一覧取得 */
  async getLocations(): Promise<Location[]> {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      locationId: r.location_id,
      locationName: r.location_name,
    }));
  },

  /** 自分のシフト取得 */
  async getMyShifts(studentId: string, date: string): Promise<Shift[]> {
    studentId = studentId.toLowerCase();
    const { data, error } = await supabase
      .from('shifts')
      .select('*, locations(location_name)')
      .eq('student_id', studentId)
      .eq('date', date)
      .order('start_time');
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      date: r.date,
      time: `${fmt(r.start_time)}-${fmt(r.end_time)}`,
      startTime: fmt(r.start_time),
      endTime: fmt(r.end_time),
      name: r.name,
      studentId: r.student_id,
      locationId: r.location_id,
      locationName: r.locations?.location_name || r.location_id,
      notice: r.notice || '',
    }));
  },

  /** 場所別シフト取得 */
  async getShiftsByLocation(locationId: string, date: string): Promise<Shift[]> {
    const { data, error } = await supabase
      .from('shifts')
      .select('*, locations(location_name)')
      .eq('location_id', locationId)
      .eq('date', date)
      .order('start_time');
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      date: r.date,
      time: `${fmt(r.start_time)}-${fmt(r.end_time)}`,
      startTime: fmt(r.start_time),
      endTime: fmt(r.end_time),
      name: r.name,
      studentId: r.student_id,
      locationId: r.location_id,
      locationName: r.locations?.location_name || r.location_id,
      notice: r.notice || '',
    }));
  },

  /** 出勤打刻（自動退勤処理込み） */
  async checkIn(studentId: string, locationId: string): Promise<{ success: boolean }> {
    studentId = studentId.toLowerCase();
    const today = getToday();
    const now = new Date().toISOString();

    // 同じ場所に既に出勤中なら無視
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('location_id', locationId)
      .eq('date', today)
      .is('check_out_at', null)
      .limit(1);
    if (existing && existing.length > 0) throw new Error('already checked in');

    // 別の場所で出勤中なら自動退勤
    const { data: prev } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('date', today)
      .is('check_out_at', null);
    if (prev && prev.length > 0) {
      await supabase
        .from('attendance')
        .update({ check_out_at: now })
        .in('id', prev.map(r => r.id));
    }

    // 新しい出勤レコード
    const { error } = await supabase.from('attendance').insert({
      student_id: studentId,
      location_id: locationId,
      check_in_at: now,
      date: today,
    });
    if (error) throw new Error(error.message);

    return { success: true };
  },

  /** 迷子ログ保存 */
  async saveLostLog(studentId: string, locationId: string): Promise<{ success: boolean }> {
    studentId = studentId.toLowerCase();
    const { error } = await supabase.from('lost_logs').insert({
      student_id: studentId,
      scanned_location_id: locationId,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  /** 自分の打刻履歴 */
  async getMyAttendance(studentId: string, date: string): Promise<AttendanceRecord[]> {
    studentId = studentId.toLowerCase();
    const { data, error } = await supabase
      .from('attendance')
      .select('*, locations(location_name)')
      .eq('student_id', studentId)
      .eq('date', date)
      .order('check_in_at');
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      id: String(r.id),
      studentId: r.student_id,
      locationId: r.location_id,
      locationName: r.locations?.location_name || r.location_id,
      checkInAt: r.check_in_at,
      checkOutAt: r.check_out_at,
      date: r.date,
    }));
  },

  /** 場所のメンバー出勤状況 */
  async getMemberStatus(locationId: string, date: string): Promise<MemberStatus[]> {
    // この場所のシフトメンバー取得
    const shifts = await this.getShiftsByLocation(locationId, date);

    // 各メンバーの出勤状況を取得
    const results: MemberStatus[] = [];
    for (const s of shifts) {
      // この場所での打刻
      const { data: rec } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', s.studentId)
        .eq('location_id', locationId)
        .eq('date', date)
        .order('check_in_at', { ascending: false })
        .limit(1);

      const record = rec?.[0];
      let status: MemberStatus['status'] = 'not_yet';
      if (record && !record.check_out_at) status = 'working';
      else if (record && record.check_out_at) status = 'left';

      // 直前の勤務（別の場所）
      let previousLocation: string | null = null;
      let previousTime: string | null = null;
      if (status === 'not_yet') {
        const { data: prevRec } = await supabase
          .from('attendance')
          .select('*, locations(location_name)')
          .eq('student_id', s.studentId)
          .neq('location_id', locationId)
          .eq('date', date)
          .not('check_out_at', 'is', null)
          .order('check_out_at', { ascending: false })
          .limit(1);
        if (prevRec?.[0]) {
          previousLocation = prevRec[0].locations?.location_name || prevRec[0].location_id;
          previousTime = `${fmtTs(prevRec[0].check_in_at)}〜${fmtTs(prevRec[0].check_out_at)}`;
        }
      }

      results.push({
        studentId: s.studentId,
        name: s.name,
        shiftTime: s.time,
        status,
        checkInAt: record ? fmtTs(record.check_in_at) : null,
        previousLocation,
        previousTime,
      });
    }
    return results;
  },
};

/** "09:00:00" → "09:00" */
function fmt(time: string): string {
  return time.slice(0, 5);
}

/** ISO timestamp → "09:00" */
function fmtTs(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}
