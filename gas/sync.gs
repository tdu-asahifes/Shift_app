// ==========================================
// スプレッドシート → Supabase 同期スクリプト
// ==========================================
//
// スプレッドシート構成:
//   日付シート（例:「11/1」）: 団体 | 昼食 | 所属 | 学籍番号 | 氏名 | 役職 | 学年 | 学科 | 下3桁 | 8:00 | 8:30 | ... | 19:30
//   「場所一覧」シート: 場所ID | 場所名
//   「当日コード」シート: 日付 | ログインコード
//   「設定」シート: シート名と日付の対応
//
// 使い方:
//   1. スクリプトプロパティに SUPABASE_URL と SUPABASE_ANON_KEY を設定
//   2. メニュー「シフト管理 → Supabaseに同期」で手動実行
//   3. トリガー設定で毎朝自動同期 + 18:30一括退勤

// ---------- 設定 ----------

// 日付シートの列インデックス（0始まり）
var COL_DEPARTMENT = 2; // 所属（局）
var COL_STUDENT_ID = 3; // 学籍番号
var COL_NAME = 4;       // 氏名
var TIME_COL_START = 9; // 時間列の開始位置（8:00〜）

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    supabaseUrl: props.getProperty('SUPABASE_URL'),
    supabaseKey: props.getProperty('SUPABASE_ANON_KEY'),
  };
}

function supabaseRequest(path, method, body) {
  var config = getConfig();
  var options = {
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
  var url = config.supabaseUrl + '/rest/v1/' + path;
  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  if (code >= 400) {
    throw new Error('Supabase error ' + code + ': ' + res.getContentText());
  }
  var text = res.getContentText();
  return text ? JSON.parse(text) : null;
}

// ---------- メニュー ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('シフト管理')
    .addItem('場所一覧を自動抽出', 'extractLocations')
    .addItem('Supabaseに同期', 'syncAll')
    .addItem('トリガー設定', 'setupTriggers')
    .addToUi();
}

// ---------- 同期メイン ----------

function syncAll() {
  // shiftsを先に削除（外部キー制約のため）
  supabaseRequest('shifts?id=gt.0', 'DELETE');
  syncLocations();
  syncDailyCodes();
  syncShiftsFromMatrix();
  SpreadsheetApp.getUi().alert('同期完了しました');
}

function syncAllSilent() {
  supabaseRequest('shifts?id=gt.0', 'DELETE');
  syncLocations();
  syncDailyCodes();
  syncShiftsFromMatrix();
  Logger.log('自動同期完了: ' + new Date());
}

// ---------- 場所一覧の同期 ----------

function syncLocations() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('場所一覧');
  if (!sheet) throw new Error('「場所一覧」シートが見つかりません');

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  supabaseRequest('locations?location_id=neq.___placeholder___', 'DELETE');

  var rows = [];
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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('当日コード');
  if (!sheet) throw new Error('「当日コード」シートが見つかりません');

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

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

// ---------- マトリックス形式シフトの同期 ----------

function syncShiftsFromMatrix() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingSheet = ss.getSheetByName('設定');
  if (!settingSheet) throw new Error('「設定」シートが見つかりません');

  // 設定シートからシート名→日付の対応を読み取る
  var settingData = settingSheet.getDataRange().getValues();
  var sheetDateMap = {}; // { シート名: 日付 }
  for (var i = 1; i < settingData.length; i++) {
    if (!settingData[i][0] || !settingData[i][1]) continue;
    sheetDateMap[String(settingData[i][0]).trim()] = formatDate(settingData[i][1]);
  }

  // 場所名→場所IDのマッピングを取得
  var locSheet = ss.getSheetByName('場所一覧');
  var locationMap = {}; // { 場所名: 場所ID }
  if (locSheet) {
    var locData = locSheet.getDataRange().getValues();
    for (var i = 1; i < locData.length; i++) {
      if (!locData[i][0]) continue;
      locationMap[String(locData[i][1]).trim()] = String(locData[i][0]).trim();
    }
  }

  var totalShifts = 0;

  // 各日付シートを処理
  var sheetNames = Object.keys(sheetDateMap);
  for (var s = 0; s < sheetNames.length; s++) {
    var sheetName = sheetNames[s];
    var date = sheetDateMap[sheetName];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('シート「' + sheetName + '」が見つかりません。スキップします。');
      continue;
    }

    var rows = convertMatrixSheet(sheet, date, locationMap);
    if (rows.length > 0) {
      // 100件ずつ分割して送信（GASのペイロード制限対策）
      for (var b = 0; b < rows.length; b += 100) {
        var batch = rows.slice(b, b + 100);
        supabaseRequest('shifts', 'POST', batch);
      }
    }
    totalShifts += rows.length;
    Logger.log(sheetName + '(' + date + '): ' + rows.length + '件');
  }

  Logger.log('シフト合計: ' + totalShifts + '件同期');
}

// マトリックスシート1枚を変換
function convertMatrixSheet(sheet, date, locationMap) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  // ヘッダーから時間列を解析
  var header = data[0];
  var timeSlots = []; // [{col, hour, minute}, ...]
  for (var c = TIME_COL_START; c < header.length; c++) {
    var h = parseTimeHeader(header[c]);
    if (h) {
      timeSlots.push({ col: c, hour: h.hour, minute: h.minute });
    }
  }

  var shifts = [];

  // 各行（人）を処理
  for (var r = 1; r < data.length; r++) {
    var department = String(data[r][COL_DEPARTMENT] || '').trim();
    var studentId = String(data[r][COL_STUDENT_ID] || '').trim().toUpperCase();
    var name = String(data[r][COL_NAME] || '').trim();
    if (!studentId || !name) continue;

    // 連続する同じ場所をグループ化
    var currentLoc = null;
    var startTime = null;
    var endTime = null;

    for (var t = 0; t < timeSlots.length; t++) {
      var ts = timeSlots[t];
      var cellValue = String(data[r][ts.col] || '').trim();
      var timeStr = padTime(ts.hour) + ':' + padTime(ts.minute);

      // 除外値はスキップ（空セルと同じ扱い）
      var isValid = cellValue && !isExcluded(cellValue);

      if (isValid && cellValue === currentLoc) {
        // 同じ場所が続く → 終了時刻を延長
        endTime = addMinutes(ts.hour, ts.minute, 30);
      } else {
        // 前のシフトを保存
        if (currentLoc) {
          var locId = locationMap[currentLoc] || toLocationId(currentLoc);
          shifts.push({
            date: date,
            start_time: startTime + ':00',
            end_time: endTime + ':00',
            name: name,
            student_id: studentId,
            location_id: locId,
            department: department,
            notice: '',
          });
        }
        // 新しいシフト開始
        if (isValid) {
          currentLoc = cellValue;
          startTime = timeStr;
          endTime = addMinutes(ts.hour, ts.minute, 30);
        } else {
          currentLoc = null;
        }
      }
    }
    // 最後のシフトを保存
    if (currentLoc) {
      var locId = locationMap[currentLoc] || toLocationId(currentLoc);
      shifts.push({
        date: date,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        name: name,
        student_id: studentId,
        location_id: locId,
        notice: '',
      });
    }
  }

  return shifts;
}

// ---------- 18:30 一括退勤 ----------

function batchCheckOut() {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var now = new Date().toISOString();

  supabaseRequest(
    'attendance?date=eq.' + today + '&check_out_at=is.null',
    'PATCH',
    { check_out_at: now }
  );
  Logger.log('一括退勤完了: ' + today);
}

// ---------- トリガー設定 ----------

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  ScriptApp.newTrigger('syncAllSilent')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

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
  return String(value).replace(/\//g, '-').trim();
}

function parseTimeHeader(value) {
  // Date型の場合（スプレッドシートが時刻として認識した場合）
  if (value instanceof Date) {
    return { hour: value.getHours(), minute: value.getMinutes() };
  }
  // "8:00", "8:30", "10:00:" など → {hour, minute}
  var s = String(value).replace(/:$/, '').trim();
  var match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return { hour: parseInt(match[1]), minute: parseInt(match[2]) };
  }
  return null;
}

function padTime(n) {
  return n < 10 ? '0' + n : String(n);
}

function addMinutes(hour, minute, add) {
  minute += add;
  if (minute >= 60) {
    hour += Math.floor(minute / 60);
    minute = minute % 60;
  }
  return padTime(hour) + ':' + padTime(minute);
}

function toLocationId(name) {
  return name
    .replace(/[\s　]/g, '_')
    .replace(/[！!]/g, '')
    .toLowerCase();
}

function padId(n) {
  if (n < 10) return '00' + n;
  if (n < 100) return '0' + n;
  return String(n);
}

// ---------- 場所一覧の自動抽出 ----------

// シフトとして扱わないセル値（除外リスト）
var EXCLUDE_VALUES = [
  '欠席', '昼食', '帰宅！', '帰宅', '全体会議',
];

// 除外パターン（部分一致）
var EXCLUDE_PATTERNS = [
  'いいよ', '確認', '候補', '担責', '枚数', '好きなように',
  '抜ける可能性', '用事で',
];

function isExcluded(value) {
  if (!value) return true;
  var v = value.trim();
  if (!v) return true;
  for (var i = 0; i < EXCLUDE_VALUES.length; i++) {
    if (v === EXCLUDE_VALUES[i]) return true;
  }
  for (var i = 0; i < EXCLUDE_PATTERNS.length; i++) {
    if (v.indexOf(EXCLUDE_PATTERNS[i]) !== -1) return true;
  }
  return false;
}

function extractLocations() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var settingSheet = ss.getSheetByName('設定');
  if (!settingSheet) {
    SpreadsheetApp.getUi().alert('「設定」シートを先に作成してください');
    return;
  }

  var settingData = settingSheet.getDataRange().getValues();
  var sheetNames = [];
  for (var i = 1; i < settingData.length; i++) {
    if (settingData[i][0]) sheetNames.push(String(settingData[i][0]).trim());
  }

  // 全シートからユニークな場所名を収集
  var locationSet = {};
  for (var s = 0; s < sheetNames.length; s++) {
    var sheet = ss.getSheetByName(sheetNames[s]);
    if (!sheet) continue;
    var data = sheet.getDataRange().getValues();
    for (var r = 1; r < data.length; r++) {
      for (var c = TIME_COL_START; c < data[r].length; c++) {
        var val = String(data[r][c] || '').trim();
        if (val && !isExcluded(val)) {
          locationSet[val] = true;
        }
      }
    }
  }

  // 場所一覧シートに書き出し
  var locSheet = ss.getSheetByName('場所一覧');
  if (!locSheet) locSheet = ss.insertSheet('場所一覧');
  locSheet.clear();
  locSheet.appendRow(['場所ID', '場所名']);

  var names = Object.keys(locationSet).sort();
  for (var i = 0; i < names.length; i++) {
    var id = 'loc' + padId(i + 1);
    locSheet.appendRow([id, names[i]]);
  }

  SpreadsheetApp.getUi().alert(
    '場所一覧を抽出しました: ' + names.length + '件\n\n' +
    '「場所一覧」シートを確認し、不要な項目があれば行を削除してください。\n' +
    '場所IDは自動生成されていますが、QRコードのURLに使うので必要に応じて編集してください。'
  );
}
