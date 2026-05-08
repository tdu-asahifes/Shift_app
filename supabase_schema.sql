-- ==========================================
-- シフト・出退勤管理システム テーブル定義
-- ==========================================

-- 場所マスタ
create table locations (
  location_id text primary key,
  location_name text not null,
  color text default ''
);

-- シフトデータ（GASからスプシ同期）
create table shifts (
  id bigint generated always as identity primary key,
  date date not null,
  start_time time not null,
  end_time time not null,
  name text not null,
  student_id text not null,
  location_id text not null references locations(location_id),
  notice text default ''
);

-- 当日ログインコード
create table daily_codes (
  date date primary key,
  code text not null
);

-- 打刻レコード
create table attendance (
  id bigint generated always as identity primary key,
  student_id text not null,
  location_id text not null references locations(location_id),
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  date date not null default current_date
);

-- 迷子ログ
create table lost_logs (
  id bigint generated always as identity primary key,
  student_id text not null,
  scanned_location_id text not null references locations(location_id),
  scanned_at timestamptz not null default now(),
  date date not null default current_date
);

-- インデックス
create index idx_shifts_student_date on shifts(student_id, date);
create index idx_shifts_location_date on shifts(location_id, date);
create index idx_attendance_student_date on attendance(student_id, date);
create index idx_attendance_location_date on attendance(location_id, date);

-- RLS（Row Level Security）ポリシー
-- anon キーでフロントから直接アクセスするため、必要な操作のみ許可

alter table locations enable row level security;
alter table shifts enable row level security;
alter table daily_codes enable row level security;
alter table attendance enable row level security;
alter table lost_logs enable row level security;

-- 読み取り: 全テーブル許可
create policy "read locations" on locations for select using (true);
create policy "read shifts" on shifts for select using (true);
create policy "read daily_codes" on daily_codes for select using (true);
create policy "read attendance" on attendance for select using (true);

-- 書き込み: 打刻と迷子ログのみ許可
create policy "insert attendance" on attendance for insert with check (true);
create policy "update attendance" on attendance for update using (true);
create policy "insert lost_logs" on lost_logs for insert with check (true);

-- ==========================================
-- テスト用初期データ
-- ==========================================

insert into locations (location_id, location_name) values
  ('uketsuke', '受付'),
  ('stage', 'ステージ'),
  ('food', 'フードコート'),
  ('parking', '駐車場');

insert into daily_codes (date, code) values
  (current_date, '1234');

insert into shifts (date, start_time, end_time, name, student_id, location_id, notice) values
  (current_date, '09:00', '12:00', '山田 太郎', '12345678', 'uketsuke', '来場者リストを確認してください'),
  (current_date, '13:00', '16:00', '山田 太郎', '12345678', 'stage', ''),
  (current_date, '09:00', '12:00', '佐藤 花子', '23456789', 'uketsuke', ''),
  (current_date, '12:00', '15:00', '鈴木 一郎', '34567890', 'uketsuke', ''),
  (current_date, '10:00', '14:00', '田中 美咲', '45678901', 'stage', 'マイクテスト14時から');
