// ==========================================
// スプレッドシート → Supabase 同期スクリプト
// ==========================================
//
// スプレッドシート構成:
//   シート1「シフト」: 日付 | 時間 | 名前 | 学籍番号 | 場所ID | 連絡
//   シート2「場所一覧」: 場所ID | 場所名
//   シート3「当日コード」: 日付 | ログインコード
//
// 使い方:
//   1. スクリプトプロパティに SUPABASE_URL と SUPABASE_ANON_KEY を設定
//   2. メニュー「シフト管理 → Supabaseに同期」で手動実行
//   3. トリガー設定で毎朝自動同期 + 18:30一括退勤

// ---------- 設定 ----------

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    supabaseUrl: props.getProperty('SUPABASE_URL'),
    supabaseKey: props.getProperty('SUPABASE_ANON_KEY'),
  };
}

function supabaseRequest(path, method, body) {
  const config = getConfig();
  const options = {
    method: method || 'GET',
    headers: {
      'apikey': config.supabaseKey,
      'Authorization': 'Bearer ' + config.supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : '',
    },
    muteHttpExceptions: true,
  };
  if (body) options.payload = JSON.stringify(body);
  const url = config.supabaseUrl + '/rest/v1/' + path;
  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  if (code >= 400) {
    throw new Error('Supabase error ' + code + ': ' + res.getContentText());
  }
  const text = res.getContentText();
  return text ? JSON.parse(text) : null;
}

// ---------- メニュー ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('シフト管理')
    .addItem('Supabaseに同期', 'syncAll')
    .addItem('トリガー設定', 'setupTriggers')
    .addToUi();
}

// ---------- 同期メイン ----------

function syncAll() {
  syncLocations();
  syncDailyCodes();
  syncShifts();
  SpreadsheetApp.getUi().alert('同期完了しました');
}

// 朝の自動同期（UIなし）
function syncAllSilent() {
  syncLocations();
  syncDailyCodes();
  syncShifts();
  Logger.log('自動同期完了: ' + new Date());
}

// ---------- 場所一覧の同期 ----------

function syncLocations() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('場所一覧');
  if (!sheet) throw new Error('「場所一覧」シートが見つかりません');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return; // ヘッダーのみ

  // 既存データを削除して再挿入
  supabaseRequest('locations?location_id=neq.___placeholder___', 'DELETE');

  const rows = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    rows.push({
      location_id: String(data[i][0]).trim(),
      location_name: String(data[i][1]).trim(),
    });
  }
  if (rows.length > 0) {
    supabaseRequest('locations', 'POST', rows);
  }
  Logger.log('場所一覧: ' + rows.length + '件同期');
}

// ---------- 当日コードの同期 ----------

function syncDailyCodes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('当日コード');
  if (!sheet) throw new Error('「当日コード」シートが見つかりません');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  // 既存データを削除して再挿入
  supabaseRequest('daily_codes?date=neq.1900-01-01', 'DELETE');

  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    rows.push({
      date: formatDate(data[i][0]),
      code: String(data[i][1]).trim(),
    });
  }
  if (rows.length > 0) {
    supabaseRequest('daily_codes', 'POST', rows);
  }
  Logger.log('当日コード: ' + rows.length + '件同期');
}

// ---------- シフトの同期 ----------

function syncShifts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シフト');
  if (!sheet) throw new Error('「シフト」シートが見つかりません');

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  // 既存シフトを削除して再挿入
  supabaseRequest('shifts?id=gt.0', 'DELETE');

  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    var time = String(data[i][1]).trim(); // "10:00-13:00"
    var parts = time.split('-');
    if (parts.length !== 2) {
      Logger.log('行' + (i + 1) + ': 時間形式が不正: ' + time);
      continue;
    }
    rows.push({
      date: formatDate(data[i][0]),
      start_time: normalizeTime(parts[0]),
      end_time: normalizeTime(parts[1]),
      name: String(data[i][2]).trim(),
      student_id: String(data[i][3]).trim(),
      location_id: String(data[i][4]).trim(),
      notice: data[i][5] ? String(data[i][5]).trim() : '',
    });
  }
  if (rows.length > 0) {
    supabaseRequest('shifts', 'POST', rows);
  }
  Logger.log('シフト: ' + rows.length + '件同期');
}

// ---------- 18:30 一括退勤 ----------

function batchCheckOut() {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var now = new Date().toISOString();

  // 本日の退勤未記録レコードを全て退勤処理
  supabaseRequest(
    'attendance?date=eq.' + today + '&check_out_at=is.null',
    'PATCH',
    { check_out_at: now }
  );
  Logger.log('一括退勤完了: ' + today);
}

// ---------- トリガー設定 ----------

function setupTriggers() {
  // 既存トリガーを削除
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // 毎朝7:00に自動同期
  ScriptApp.newTrigger('syncAllSilent')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  // 毎日18:30に一括退勤
  ScriptApp.newTrigger('batchCheckOut')
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .nearMinute(30)
    .create();

  SpreadsheetApp.getUi().alert(
    'トリガーを設定しました\n' +
    '・毎朝 7:00 自動同期\n' +
    '・毎日 18:30 一括退勤'
  );
}

// ---------- ユーティリティ ----------

function formatDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  // 文字列の場合（2025/11/01 → 2025-11-01）
  return String(value).replace(/\//g, '-').trim();
}

function normalizeTime(t) {
  t = t.trim();
  // "9:00" → "09:00"
  if (/^\d:\d{2}$/.test(t)) t = '0' + t;
  return t + ':00'; // PostgreSQL time型用に秒を追加
}
