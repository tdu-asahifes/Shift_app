# シフト・出退勤管理システム

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![Google Apps Script](https://img.shields.io/badge/GAS-Sync-4285F4?logo=google)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel)

学園祭実行委員向けのシフト確認・出退勤管理Webアプリ。QRコード打刻、自動退勤、シフトタイムライン表示などをシンプルに提供します。

## 機能

### スタッフ向け
- **QRコード打刻** — 各場所のQRを読み取って出勤（アプリ内スキャン / 外部カメラ対応）
- **自動退勤** — 別の場所で打刻すると前の場所を自動退勤
- **18:30一括退勤** — GASタイマーで全員自動退勤
- **シフトタイムライン** — 縦軸タイムラインで一日のシフトを可視化、タップで詳細表示
- **出勤状況確認** — 同じ場所のメンバーの出勤状態を表示
- **打刻履歴** — 当日の出退勤ログを一覧表示
- **迷子ログ** — シフト外の場所をスキャンした記録を管理者向けに保存
- **簡易ログイン** — 学籍番号 + 当日コード（日替わり）
- **プッシュ通知** — シフト開始5分前のリマインダー、未打刻催促、管理者からの一斉通知

### 管理者向け（`/admin`）
- **シフト管理** — マトリックス表示（時間×スタッフ）、ドラッグ範囲選択、一括追加、フィルタ/ソート
- **出勤状況ダッシュボード** — カテゴリ別の全場所出勤状況、不足人数表示
- **場所・コード管理** — 場所のCRUD（カテゴリ・色設定）、当日コード設定、QRコード生成
- **通知送信** — 全スタッフへの一斉プッシュ通知
- **迷子ログ閲覧** — 場所外打刻の一覧表示

## 構成

```
shift_app/              Next.js フロントエンド
├── app/                ページ（/, /check, /admin）
│   └── api/            API Routes（管理者操作、通知、cron）
├── components/         UIコンポーネント
│   └── admin/          管理者画面コンポーネント
├── lib/                Supabaseクライアント、型定義、セッション管理
├── public/             静的ファイル（manifest.json, sw.js, アイコン）
└── scripts/            QRコード生成スクリプト

gas/                    Google Apps Script（スプシ→Supabase同期、リマインダー）
supabase_schema.sql     DBスキーマ定義
```

## セットアップ

### 1. Supabase

1. [Supabase](https://supabase.com) でプロジェクト作成
2. SQL Editor で `supabase_schema.sql` を実行
3. Data API > Settings で全テーブルを Exposed に設定

### 2. フロントエンド

```bash
cd shift_app
npm install
```

`.env.local` を作成:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=任意のパスワード
NEXT_PUBLIC_VAPID_PUBLIC_KEY=VAPID公開鍵
VAPID_PRIVATE_KEY=VAPID秘密鍵
VAPID_SUBJECT=mailto:admin@example.com
CRON_SECRET=任意の文字列
```

```bash
npm run dev
```

### 3. スプレッドシート + GAS

スプレッドシートに以下のシートを作成:

| シート名 | 列構成 |
|---|---|
| 日付シート | 団体 \| 昼食 \| 所属 \| 学籍番号 \| 氏名 \| 役職 \| 学年 \| 学科 \| 下3桁 \| 8:00 \| 8:30 \| ... |
| 場所一覧 | 場所ID \| 場所名 \| カテゴリ \| 色 |
| 当日コード | 日付 \| ログインコード |
| 設定 | シート名 \| 日付 |

GAS（`gas/sync.gs`）をスクリプトエディタに貼り付け、スクリプトプロパティに設定:

| プロパティ | 値 |
|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` |
| `APP_URL` | デプロイURL（例: `https://shift-app-xxx.vercel.app`） |
| `CRON_SECRET` | Vercelと同じ値 |

メニュー「シフト管理 → トリガー設定」で以下を有効化:
- 毎朝 7:00 自動同期
- 毎日 18:30 一括退勤
- 5分間隔 シフトリマインダー

### 4. デプロイ

GitHubにpushすればVercelが自動デプロイ。

環境変数はVercelダッシュボードのプロジェクト Settings → Environment Variables で設定。

### 5. GASの更新

`gas/sync.gs` を変更した場合、GASのスクリプトエディタに手動で貼り付けて保存する。
同期を反映するにはスプレッドシートの「シフト管理 → Supabaseに同期」を実行。

## QRコード

各場所に設置するQRコードは以下のURL形式:

```
https://<デプロイURL>/check?location=<場所ID>
```

### QRコード一括生成

管理画面（`/admin` → 場所・コード）の「QRコード生成」ボタンで生成・印刷可能。

CLIでも生成できる:

```bash
cd shift_app
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... node scripts/generate-qr.mjs <デプロイURL>
```

出力:
- `qr_codes/*.png` — 各場所のQR画像
- `qr_codes/all.pdf` — 全場所を1ページ1枚でまとめたPDF（場所名付き・印刷用）

## プッシュ通知

VAPID鍵の生成:
```bash
npx web-push generate-vapid-keys
```

通知の種類:
- **管理者→全体通知** — `/admin` の通知タブから送信
- **シフトリマインダー** — 開始5分前に自動通知、開始5分後に未打刻なら催促通知（GAS 5分間隔トリガー経由）
