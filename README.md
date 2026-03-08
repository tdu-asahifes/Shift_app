# 文化祭シフト管理システム v2

## ✅ v2で追加・変更した内容

| 機能 | 内容 |
|------|------|
| 通知送信先の選択 | 全員 / 局・部門 / 役職 / 個人指定 の4モード |
| シフトリマインダー | 開始30分前・5分前に本人へPush通知 |
| Discordチャンネル | `#鍵管理`・`#緊急連絡` の2本構成に変更 |
| Web Push送信対象 | 出退勤→本人、鍵→管理者、連絡→選択した対象者 |

---

## 📁 ファイル構成

```
demo-v2/
├── GAS_Code.gs                     ← GASバックエンド（v2）
├── .env.local.example
├── next.config.js / tailwind / tsconfig など
├── public/
│   ├── manifest.json               ← PWA設定
│   └── sw-push.js                  ← Service Worker
└── src/
    ├── app/
    │   ├── layout.tsx / page.tsx / globals.css
    │   └── api/push/route.ts       ← Push送信APIエンドポイント
    ├── components/
    │   ├── LoginPage.tsx
    │   ├── Dashboard.tsx           ← メイン画面（v2）
    │   ├── NotificationComposer.tsx ← 送信先選択UI（新規）
    │   ├── NotificationCenter.tsx  ← ベル通知センター
    │   └── Toast.tsx
    └── lib/
        ├── gas.ts                  ← GAS通信クライアント（v2）
        └── usePush.ts              ← Web Push購読フック
```

---

## 🔔 通知の全体設計

### アクション別・送信先

| アクション | Discord | Web Push送信先 |
|-----------|---------|--------------|
| 出勤記録 | なし | 本人のみ |
| 退勤記録 | なし | 本人のみ |
| シフト開始30分前 | なし | 本人のみ（自動） |
| シフト開始5分前 | なし | 本人のみ（自動） |
| 鍵貸出・返却 | `#鍵管理` | 管理者（本部）のみ |
| 鍵未返却アラート | `#鍵管理` | 管理者（本部）のみ |
| 全体・個別連絡 | `#緊急連絡` | 送信時に選択した対象者 |

### 送信先の選び方（通知タブから）

- **全員** → 全スタッフ一括
- **局・部門** → 食品局だけ・運営局だけ など
- **役職** → リーダーのみ・本部のみ など
- **個人指定** → チェックボックスで1人〜複数人

---

## 🚀 セットアップ手順

### STEP 1: Googleスプレッドシート＆GASのセットアップ

1. Googleスプレッドシートを新規作成
2. スプレッドシートIDをコピー
3. 「拡張機能」→「Apps Script」→ `GAS_Code.gs` を貼り付け
4. `SPREADSHEET_ID` を実際のIDに変更
5. `setupSpreadsheet()` を実行（初回のみ）
6. 「デプロイ」→「新しいデプロイ」→ Webアプリ・全員に公開
7. WebアプリのURLをコピー

### STEP 2: GASトリガーを設定する（シフトリマインダー）

GASエディタ → 時計アイコン（トリガー）→「トリガーを追加」

| 関数名 | 実行タイミング |
|--------|-------------|
| `checkShiftReminders` | 時間ベース → 1分おき |
| `checkUnreturnedKeys` | 時間ベース → 1時間おき |

### STEP 3: DiscordのWebhook URLを取得する

1. Discordサーバーに2つのチャンネルを用意
   - `#鍵管理`（鍵の貸し借りログ）
   - `#緊急連絡`（全体通知・緊急連絡）
2. 各チャンネル設定 →「連携サービス」→「ウェブフック」→「新しいウェブフック」
3. URLをコピーしてスプレッドシートの「設定」シートに貼り付け：
   - `DISCORD_WEBHOOK_KEY` → `#鍵管理` のURL
   - `DISCORD_WEBHOOK_EMERGENCY` → `#緊急連絡` のURL

### STEP 4: VAPIDキーを生成する

```bash
npx web-push generate-vapid-keys
```

### STEP 5: Next.jsのセットアップ

```bash
npm install
cp .env.local.example .env.local
# .env.local を編集して各URLを入力
npm run dev
```

### STEP 6: Vercelにデプロイ

```bash
git init && git add . && git commit -m "v2"
git remote add origin https://github.com/YOUR_NAME/festival-shift.git
git push -u origin main
```

Vercelで環境変数を `.env.local` と同じ内容で設定してデプロイ。

スプレッドシートの「設定」シートの `APP_URL` にVercelのURLを入力することで、GASからPush通知を送信できるようになります。

---

## ⚙️ 毎朝のパスワード変更

スプレッドシートの「設定」シートの `TODAY_PASSWORD` を変更するだけです。

---

## ❓ トラブルシューティング

| 症状 | 対処 |
|------|------|
| シフトリマインダーが来ない | GASトリガーが設定されているか確認 |
| 鍵通知が管理者に来ない | 名簿シートの役職が「本部」になっているか確認 |
| 送信先の人数が0になる | スタッフの局・役職がスプレッドシートと一致しているか確認 |
| Discord通知が届かない | スプレッドシートのWebhook URLを確認 |
