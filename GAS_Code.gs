// ============================================================
// 文化祭シフト管理システム v2 - GAS バックエンド
// Discord: #鍵管理 / #緊急連絡 の2チャンネル
// Web Push: アクション別送信対象
// シフトリマインダー: 30分前・5分前
// ============================================================

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

const SHEET = {
  STAFF:         '名簿',
  SHIFT:         'シフト',
  ATTENDANCE:    '勤怠ログ',
  KEY:           '鍵管理',
  CONFIG:        '設定',
  NOTIFICATIONS: '通知ログ',
  PUSH_SUBS:     'Push購読者',
};

// ===== レスポンス =====
function res(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action || '';
  try {
    switch (action) {
      case 'ping':             return res({ ok: true, time: now() });
      case 'checkPassword':    return res(checkPassword(e.parameter.password));
      case 'getStaff':         return res(getAllStaff());
      case 'getAttendance':    return res(getTodayAttendance());
      case 'getKeyStatus':     return res(getKeyStatus());
      case 'getNotifications': return res(getNotifications(e.parameter.since));
      case 'getMyShifts':      return res(getMyShifts(e.parameter.staffId));
      default:                 return res({ ok: false, message: '不明なアクション' });
    }
  } catch (err) {
    Logger.log(err);
    return res({ ok: false, message: err.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    switch (data.action) {
      case 'checkIn':          return res(checkIn(data));
      case 'checkOut':         return res(checkOut(data));
      case 'borrowKey':        return res(borrowKey(data));
      case 'returnKey':        return res(returnKey(data));
      case 'sendNotification': return res(sendNotification(data));
      case 'savePushSub':      return res(savePushSubscription(data));
      default:                 return res({ ok: false, message: '不明なアクション' });
    }
  } catch (err) {
    Logger.log(err);
    return res({ ok: false, message: err.toString() });
  }
}

// ===== ユーティリティ =====
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const s = ss.getSheetByName(name);
  if (!s) throw new Error(`シート「${name}」が見つかりません`);
  return s;
}
function now()      { return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'); }
function todayStr() { return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd'); }

function getConfig(key) {
  const rows = getSheet(SHEET.CONFIG).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) return String(rows[i][1]).trim();
  }
  return '';
}

// ===== パスワード認証 =====
function checkPassword(input) {
  const correct = getConfig('TODAY_PASSWORD');
  if (!correct) return { ok: false, message: 'パスワードが未設定です' };
  const ok = correct === String(input).trim();
  return { ok, message: ok ? '認証成功' : 'パスワードが違います' };
}

// ===== スタッフ =====
function getAllStaff() {
  const rows = getSheet(SHEET.STAFF).getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) list.push({
      id: rows[i][0], name: rows[i][1], section: rows[i][2],
      team: rows[i][3], role: rows[i][4],
    });
  }
  return { ok: true, staff: list };
}

function findStaff(staffId) {
  const rows = getSheet(SHEET.STAFF).getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(staffId))
      return { id: rows[i][0], name: rows[i][1], section: rows[i][2], team: rows[i][3], role: rows[i][4] };
  }
  return null;
}

// ===== 出退勤 =====
function checkIn(data) {
  const staff = findStaff(data.staffId);
  if (!staff) return { ok: false, message: 'スタッフが見つかりません' };
  if (isCheckedIn(data.staffId)) return { ok: false, message: `${staff.name} さんはすでに出勤中です` };

  getSheet(SHEET.ATTENDANCE).appendRow([
    now(), data.staffId, staff.name, staff.section, data.boothId || '未指定', '出勤', '', ''
  ]);

  const msg = `✅ 出勤しました（${data.boothId || '未指定'}）`;
  saveNotification('出勤', `${staff.name} さんが出勤しました`, staff.section);

  // Web Push: 本人のみ
  pushToStaff([data.staffId], '出勤記録', msg, 'checkin');

  return { ok: true, message: `${staff.name} さんの出勤を記録しました`, staff };
}

function checkOut(data) {
  const staff = findStaff(data.staffId);
  if (!staff) return { ok: false, message: 'スタッフが見つかりません' };

  const sheet = getSheet(SHEET.ATTENDANCE);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(data.staffId) && rows[i][5] === '出勤' && !rows[i][6]) {
      sheet.getRange(i + 1, 7).setValue(now());
      sheet.getRange(i + 1, 6).setValue('退勤済');

      saveNotification('退勤', `${staff.name} さんが退勤しました`, staff.section);

      // Web Push: 本人のみ
      pushToStaff([data.staffId], '退勤記録', `👋 退勤を記録しました`, 'checkout');

      return { ok: true, message: `${staff.name} さんの退勤を記録しました` };
    }
  }
  return { ok: false, message: '出勤記録が見つかりません' };
}

function isCheckedIn(staffId) {
  const rows = getSheet(SHEET.ATTENDANCE).getDataRange().getValues();
  const today = todayStr();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]).startsWith(today) &&
        String(rows[i][1]) === String(staffId) &&
        rows[i][5] === '出勤' && !rows[i][6]) return true;
  }
  return false;
}

function getTodayAttendance() {
  const rows = getSheet(SHEET.ATTENDANCE).getDataRange().getValues();
  const today = todayStr();
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).startsWith(today)) {
      result.push({
        time: rows[i][0], staffId: rows[i][1], name: rows[i][2],
        section: rows[i][3], booth: rows[i][4], status: rows[i][5], checkOut: rows[i][6],
      });
    }
  }
  return { ok: true, attendance: result };
}

// ===== シフト取得 =====
function getMyShifts(staffId) {
  if (!staffId) return { ok: false, message: 'スタッフIDが必要です' };
  const rows = getSheet(SHEET.SHIFT).getDataRange().getValues();
  const today = todayStr();
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).startsWith(today) && String(rows[i][1]) === String(staffId)) {
      result.push({
        date: rows[i][0], staffId: rows[i][1], staffName: rows[i][2],
        section: rows[i][3], team: rows[i][4], booth: rows[i][5],
        startTime: rows[i][6], endTime: rows[i][7], role: rows[i][8], note: rows[i][9],
      });
    }
  }
  return { ok: true, shifts: result };
}

// ===== シフトリマインダー（GASトリガーで実行）=====
// GASエディタで「トリガー」→「時間ベース」→「1分おきに実行」に設定してください
function checkShiftReminders() {
  const now_      = new Date();
  const rows      = getSheet(SHEET.SHIFT).getDataRange().getValues();
  const todayDate = todayStr();

  for (let i = 1; i < rows.length; i++) {
    if (!String(rows[i][0]).startsWith(todayDate)) continue;

    const staffId   = String(rows[i][1]);
    const staffName = String(rows[i][2]);
    const booth     = String(rows[i][5]);
    const startStr  = String(rows[i][6]); // 例: "09:30"
    if (!startStr || !startStr.includes(':')) continue;

    const [h, m]    = startStr.split(':').map(Number);
    const shiftStart = new Date(now_);
    shiftStart.setHours(h, m, 0, 0);

    const diffMin = (shiftStart - now_) / 60000;

    // 30分前（29〜31分の範囲）
    if (diffMin >= 29 && diffMin < 31) {
      pushToStaff([staffId], '⏰ シフト開始30分前',
        `${startStr} から ${booth} での担当が始まります`, 'shift-reminder');
      saveNotification('シフトリマインダー', `${staffName}: ${startStr}〜 ${booth}（30分前）`, '');
    }

    // 5分前（4〜6分の範囲）
    if (diffMin >= 4 && diffMin < 6) {
      pushToStaff([staffId], '⏰ シフト開始5分前',
        `まもなく ${startStr} から ${booth} の担当が始まります！`, 'shift-reminder');
      saveNotification('シフトリマインダー', `${staffName}: ${startStr}〜 ${booth}（5分前）`, '');
    }
  }
}

// ===== 鍵管理 =====
function borrowKey(data) {
  const staff = findStaff(data.staffId);
  if (!staff) return { ok: false, message: 'スタッフが見つかりません' };
  if (isKeyOut(data.keyId)) return { ok: false, message: `鍵「${data.keyId}」は貸出中です` };

  getSheet(SHEET.KEY).appendRow([
    now(), data.keyId, data.keyName || data.keyId,
    data.staffId, staff.name, staff.section, '', '貸出中', ''
  ]);

  const msg = `🔑 **${data.keyName || data.keyId}** を **${staff.name}** さんに貸し出しました`;
  saveNotification('鍵貸出', msg, '鍵管理');
  sendDiscord('key', msg, false);

  // Web Push: 管理者のみ
  pushToRole(['本部', '管理者'], '🔑 鍵貸出',
    `${data.keyName || data.keyId} → ${staff.name}`, 'key');

  return { ok: true, message: `鍵「${data.keyName || data.keyId}」を貸し出しました` };
}

function returnKey(data) {
  const sheet = getSheet(SHEET.KEY);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(data.keyId) && rows[i][7] === '貸出中') {
      sheet.getRange(i + 1, 7).setValue(now());
      sheet.getRange(i + 1, 8).setValue('返却済');

      const msg = `🔒 **${rows[i][2]}** が返却されました（${rows[i][4]}さんより）`;
      saveNotification('鍵返却', msg, '鍵管理');
      sendDiscord('key', msg, false);

      // Web Push: 管理者のみ
      pushToRole(['本部', '管理者'], '🔒 鍵返却',
        `${rows[i][2]} が返却されました`, 'key');

      return { ok: true, message: `鍵「${rows[i][2]}」の返却を記録しました` };
    }
  }
  return { ok: false, message: '貸出記録が見つかりません' };
}

// 未返却チェック（トリガーで定期実行可能）
function checkUnreturnedKeys() {
  const rows = getSheet(SHEET.KEY).getDataRange().getValues();
  const today = todayStr();
  for (let i = 1; i < rows.length; i++) {
    if (!String(rows[i][0]).startsWith(today) || rows[i][7] !== '貸出中') continue;
    const borrowedAt = new Date(rows[i][0]);
    const diffMin = (new Date() - borrowedAt) / 60000;
    if (diffMin > 60) { // 1時間以上未返却
      const msg = `⚠️ 鍵「${rows[i][2]}」が1時間以上未返却です（借用: ${rows[i][4]}）`;
      sendDiscord('key', msg, false);
      pushToRole(['本部', '管理者'], '⚠️ 鍵未返却アラート', msg, 'key-alert');
    }
  }
}

function isKeyOut(keyId) {
  const rows = getSheet(SHEET.KEY).getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(keyId) && rows[i][7] === '貸出中') return true;
  }
  return false;
}

function getKeyStatus() {
  const rows = getSheet(SHEET.KEY).getDataRange().getValues();
  const today = todayStr();
  const keys = {};
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][1] || !String(rows[i][0]).startsWith(today)) continue;
    keys[rows[i][1]] = {
      keyId: rows[i][1], keyName: rows[i][2], borrowerName: rows[i][4],
      section: rows[i][5], borrowedAt: rows[i][0], returnedAt: rows[i][6], status: rows[i][7],
    };
  }
  return { ok: true, keys: Object.values(keys) };
}

// ===== 全体通知送信（フロントから呼び出し）=====
// data.targetMode: 'all' | 'section' | 'role' | 'individual'
// data.targets: 対象の配列（section名・role名・staffId）
// data.message: メッセージ本文
// data.urgent: 緊急フラグ
function sendNotification(data) {
  const { targetMode, targets, message, urgent, title } = data;

  // Discord送信（緊急連絡チャンネル）
  const discordMsg = urgent ? `🚨 **【緊急】** ${message}` : message;
  sendDiscord('emergency', discordMsg, urgent);

  // Web Push: 対象者を解決して送信
  let staffIds = [];
  switch (targetMode) {
    case 'all':
      staffIds = getAllStaff().staff.map(s => s.id);
      break;
    case 'section':
      staffIds = getAllStaff().staff.filter(s => targets.includes(s.section)).map(s => s.id);
      break;
    case 'role':
      staffIds = getAllStaff().staff.filter(s => targets.includes(s.role)).map(s => s.id);
      break;
    case 'individual':
      staffIds = targets;
      break;
    default:
      staffIds = [];
  }

  pushToStaff(staffIds, title || (urgent ? '🚨 緊急連絡' : '📢 お知らせ'), message, 'announcement');
  saveNotification(urgent ? '緊急' : '全体連絡', message, targetMode);

  return { ok: true, message: `${staffIds.length}名に通知しました`, count: staffIds.length };
}

// ===== Discord Webhook =====
function sendDiscord(channel, message, urgent) {
  try {
    const key = channel === 'key' ? 'DISCORD_WEBHOOK_KEY' : 'DISCORD_WEBHOOK_EMERGENCY';
    const webhookUrl = getConfig(key);
    if (!webhookUrl) return { ok: false, message: `${key} が未設定です` };

    const content = urgent ? `@everyone\n${message}` : message;
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ content, username: '文化祭シフト管理' }),
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    return { ok: code === 204 || code === 200 };
  } catch (err) {
    Logger.log('Discord error: ' + err);
    return { ok: false, message: err.toString() };
  }
}

// ===== Web Push送信ヘルパー =====

// スタッフIDリストに送信
function pushToStaff(staffIds, title, body, tag) {
  if (!staffIds || !staffIds.length) return;
  const subs = getPushSubscriptions();
  staffIds.forEach(id => {
    const sub = subs[String(id)];
    if (sub) callPushApi(sub, title, body, tag);
  });
}

// 役職で対象を絞って送信
function pushToRole(roles, title, body, tag) {
  const all = getAllStaff().staff;
  const ids = all.filter(s => roles.includes(s.role)).map(s => s.id);
  pushToStaff(ids, title, body, tag);
}

// Push購読情報を取得
function getPushSubscriptions() {
  const rows = getSheet(SHEET.PUSH_SUBS).getDataRange().getValues();
  const map = {};
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][1]) {
      try { map[String(rows[i][0])] = JSON.parse(rows[i][1]); } catch (_) {}
    }
  }
  return map;
}

// Next.js の /api/push を呼び出してPushを送信
function callPushApi(subscription, title, body, tag) {
  try {
    const appUrl = getConfig('APP_URL'); // VercelのURL
    if (!appUrl) return;
    UrlFetchApp.fetch(`${appUrl}/api/push`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ subscription, title, body, tag }),
      muteHttpExceptions: true,
    });
  } catch (err) {
    Logger.log('Push API error: ' + err);
  }
}

// ===== アプリ内通知ログ =====
function saveNotification(type, message, section) {
  try {
    getSheet(SHEET.NOTIFICATIONS).appendRow([now(), type, message, section]);
  } catch (e) { Logger.log('通知保存エラー: ' + e); }
}

function getNotifications(since) {
  const rows = getSheet(SHEET.NOTIFICATIONS).getDataRange().getValues();
  const result = [];
  for (let i = rows.length - 1; i >= 1; i--) {
    if (result.length >= 50) break;
    if (since && String(rows[i][0]) <= since) break;
    result.push({ time: rows[i][0], type: rows[i][1], message: rows[i][2], section: rows[i][3] });
  }
  return { ok: true, notifications: result };
}

// ===== Push購読者管理 =====
function savePushSubscription(data) {
  const sheet = getSheet(SHEET.PUSH_SUBS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.staffId)) {
      sheet.getRange(i + 1, 2).setValue(JSON.stringify(data.subscription));
      sheet.getRange(i + 1, 3).setValue(now());
      return { ok: true, message: '購読情報を更新しました' };
    }
  }
  sheet.appendRow([data.staffId, JSON.stringify(data.subscription), now()]);
  return { ok: true, message: '購読情報を保存しました' };
}

// ===== 初期セットアップ =====
function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const configs = [
    { name: SHEET.STAFF,         headers: ['スタッフID','氏名','局・部門','チーム','役職','連絡先'] },
    { name: SHEET.SHIFT,         headers: ['日付','スタッフID','氏名','局・部門','チーム','ブース','開始時刻','終了時刻','役割','備考'] },
    { name: SHEET.ATTENDANCE,    headers: ['タイムスタンプ','スタッフID','氏名','局・部門','ブース','種別','退勤時刻','備考'] },
    { name: SHEET.KEY,           headers: ['タイムスタンプ','鍵ID','鍵名','スタッフID','借用者名','局・部門','返却時刻','状態','備考'] },
    { name: SHEET.CONFIG,        headers: ['設定キー','設定値','説明'] },
    { name: SHEET.NOTIFICATIONS, headers: ['タイムスタンプ','種別','メッセージ','局・対象'] },
    { name: SHEET.PUSH_SUBS,     headers: ['スタッフID','購読情報JSON','登録日時'] },
  ];

  configs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) sheet = ss.insertSheet(cfg.name);
    const r = sheet.getRange(1, 1, 1, cfg.headers.length);
    r.setValues([cfg.headers]).setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  const configSheet = ss.getSheetByName(SHEET.CONFIG);
  const existing = configSheet.getDataRange().getValues().map(r => r[0]);
  [
    ['TODAY_PASSWORD',           'fest2025',  '当日パスワード（毎朝変更）'],
    ['DISCORD_WEBHOOK_KEY',      '',          '鍵管理用DiscordチャンネルのWebhook URL'],
    ['DISCORD_WEBHOOK_EMERGENCY','',          '緊急連絡用DiscordチャンネルのWebhook URL'],
    ['APP_URL',                  '',          'VercelのアプリURL（Push通知送信に使用）'],
    ['EVENT_NAME',               '文化祭',    'イベント名'],
  ].forEach(row => { if (!existing.includes(row[0])) configSheet.appendRow(row); });

  // サンプルスタッフ
  const staffSheet = ss.getSheetByName(SHEET.STAFF);
  if (staffSheet.getLastRow() <= 1) {
    [
      ['S001','テスト太郎','運営局','Aチーム','本部',''],
      ['S002','テスト花子','食品局','Bチーム','リーダー',''],
      ['S003','テスト次郎','装飾局','Cチーム','一般',''],
    ].forEach(r => staffSheet.appendRow(r));
  }

  // サンプルシフト（今日の日付で）
  const shiftSheet = ss.getSheetByName(SHEET.SHIFT);
  if (shiftSheet.getLastRow() <= 1) {
    const today = todayStr();
    [
      [today,'S001','テスト太郎','運営局','Aチーム','本部前','09:00','12:00','本部',''],
      [today,'S002','テスト花子','食品局','Bチーム','食品ブース','10:00','14:00','リーダー',''],
      [today,'S003','テスト次郎','装飾局','Cチーム','装飾エリア','13:00','17:00','一般',''],
    ].forEach(r => shiftSheet.appendRow(r));
  }

  return '✅ セットアップ完了！';
}

// ===== トリガー設定ヘルプ =====
// GASエディタ → トリガー → 以下を追加:
// checkShiftReminders: 時間ベース → 1分おき
// checkUnreturnedKeys: 時間ベース → 1時間おき
