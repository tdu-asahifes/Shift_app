/**
 * 場所一覧のQRコードを一括生成するスクリプト
 *
 * 使い方:
 *   cd shift_app
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... node scripts/generate-qr.mjs <デプロイURL>
 *
 * 出力:
 *   qr_codes/          各場所のQR画像（PNG）
 *   qr_codes/all.pdf   全場所を1ページ1枚でまとめたPDF（印刷用）
 */

import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { mkdir, writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', '..', 'qr_codes');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpcssxkvmsokowshkkge.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('使い方: node scripts/generate-qr.mjs <デプロイURL>');
  console.error('例: node scripts/generate-qr.mjs https://shift-app-seven-zeta.vercel.app');
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error('環境変数 NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data: locations, error } = await supabase
    .from('locations')
    .select('location_id, location_name')
    .order('location_id');

  if (error) {
    console.error('場所一覧の取得に失敗:', error.message);
    process.exit(1);
  }

  if (!locations || locations.length === 0) {
    console.error('場所データがありません。先にGASで同期してください。');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`${locations.length}件の場所のQRコードを生成します...\n`);

  // --- PNG生成 ---
  const qrBuffers = [];
  for (const loc of locations) {
    const url = `${baseUrl}/check?location=${loc.location_id}`;
    const filename = `${loc.location_id}.png`;
    const filepath = join(OUTPUT_DIR, filename);

    const buffer = await QRCode.toBuffer(url, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    await writeFile(filepath, buffer);
    qrBuffers.push({ loc, buffer, url });

    console.log(`  ${loc.location_name} (${loc.location_id})`);
  }

  // --- PDF生成（1ページ1場所、場所名付き） ---
  const pdfPath = join(OUTPUT_DIR, 'all.pdf');
  await generatePDF(qrBuffers, pdfPath);

  console.log(`\n完了!`);
  console.log(`  PNG: qr_codes/*.png (${locations.length}件)`);
  console.log(`  PDF: qr_codes/all.pdf (印刷用)`);
}

async function generatePDF(items, outputPath) {
  const fontPath = join(__dirname, 'fonts', 'NotoSansJP.ttf');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    doc.registerFont('NotoSansJP', fontPath);

    const pageWidth = doc.page.width;
    const qrSize = 300;

    for (let i = 0; i < items.length; i++) {
      if (i > 0) doc.addPage();

      const { loc, buffer } = items[i];

      // QRコードを中央に配置
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 150;
      doc.image(buffer, qrX, qrY, { width: qrSize, height: qrSize });

      // 場所名をQRコードの下部中央に表示
      const labelY = qrY + qrSize + 20;
      const margin = doc.page.margins.left;
      const textWidth = pageWidth - margin * 2;
      doc.fontSize(20).font('NotoSansJP');
      doc.text(loc.location_name, margin, labelY, {
        align: 'center',
        width: textWidth,
      });

      // 場所IDを小さく表示
      doc.fontSize(12).font('NotoSansJP');
      doc.text(loc.location_id, margin, labelY + 30, {
        align: 'center',
        width: textWidth,
      });
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

main();
