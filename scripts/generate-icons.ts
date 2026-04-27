#!/usr/bin/env node
/**
 * Generates PWA home-screen icons from public/ajk-logo.png.
 * Re-run any time the source logo changes:
 *   pnpm tsx scripts/generate-icons.ts
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(root, 'public', 'ajk-logo.png');
const outDir = join(root, 'public', 'icons');

const BG = { r: 255, g: 255, b: 255, alpha: 1 };

/**
 * Source logo is 3:2 (1536x1024). To make the AJK text legible at small
 * home-screen sizes we let it fill almost the full width of the icon
 * canvas, then center vertically. Horizontal margin is ~4%, vertical
 * margin lands around 16% — comfortably inside the maskable safe zone.
 */
async function makeIcon(size: number, filename: string) {
  const targetWidth = Math.round(size * 0.92);
  const trimmed = await sharp(source).trim({ background: 'white', threshold: 10 }).toBuffer();
  const logo = await sharp(trimmed)
    .resize({ width: targetWidth, withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((size - (meta.width ?? targetWidth)) / 2);
  const top = Math.round((size - (meta.height ?? targetWidth)) / 2);
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(join(outDir, filename));
  console.log(`wrote ${filename} (${size}x${size})`);
}

async function main() {
  await Promise.all([
    makeIcon(192, 'icon-192.png'),
    makeIcon(512, 'icon-512.png'),
    makeIcon(180, 'apple-touch-icon.png'),
  ]);
}

main().catch((e) => { console.error(e); process.exit(1); });
