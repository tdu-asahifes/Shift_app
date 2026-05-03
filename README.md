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

- **QRコード打刻** — 各場所のQRを読み取って出勤（アプリ内スキャン / 外部カメラ対応）
- **自動退勤** — 別の場所で打刻すると前の場所を自動退勤
- **18:30一括退勤** — GASタイマーで全員自動退勤
- **シフトタイムライン** — 帯グラフで一日のシフトを可視化
- **出勤状況確認** — 同じ場所のメンバーの出勤状態を表示
- **打刻履歴** — 当日の出退勤ログを一覧表示
- **迷子ログ** — シフト外の場所をスキャンした記録を管理者向けに保存
- **簡易ログイン** — 学籍番号 + 当日コード（日替わり）

## 構成

```
shift_app/          Next.js フロントエンド
├── app/            ページ（/, /check）
├── components/     UIコンポーネント
└── lib/            Supabaseクライアント、型定義、セッション管理

gas/                Google Apps Script（スプシ→Supabase同期）
supabase_schema.sql DBスキーマ定義
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
```

```bash
npm run dev
```

### 3. スプレッドシート + GAS

スプレッドシートに以下のシートを作成:

| シート名 | 列構成 |
|---|---|
| シフト | 日付 \| 時間 \| 名前 \| 学籍番号 \| 場所ID \| 連絡 |
| 場所一覧 | 場所ID \| 場所名 |
| 当日コード | 日付 \| ログインコード |

GAS（`gas/sync.gs`）をスクリプトエディタに貼り付け、スクリプトプロパティに設定:

| プロパティ | 値 |
|---|---|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` |

メニュー「シフト管理 → トリガー設定」で自動同期（毎朝7:00）と一括退勤（18:30）を有効化。

### 4. デプロイ

```bash
cd shift_app
npx vercel login
npx vercel --prod
```

環境変数（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`）をVercelに設定。

## QRコード

各場所に設置するQRコードは以下のURL形式:

```
https://<デプロイURL>/check?location=<場所ID>
```

例: `https://example.vercel.app/check?location=uketsuke`
