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
 * Crop the source logo (1536×1024) down to just the "///AJK" mark — drop
 * the SITE DEVELOPMENT INC. subtitle bar and the excavator graphic so the
 * brand is legible at home-screen sizes (~60px on iOS).
 *
 * Detection: scan the raw RGB pixels and find the bounding box of the
 * brand-yellow letters (≈#FFC20E). Pad left to capture the dark slashes,
 * pad top/bottom so the letter glyphs aren't clipped, and stop short of
 * the subtitle bar that sits directly underneath.
 */
/** First column with at least 3 hits — skips 1-pixel scanner artifacts. */
function findFirstSubstantial(counts: Uint32Array): number {
  for (let x = 0; x < counts.length; x++) if (counts[x] >= 3) return x;
  return 0;
}

async function getCroppedAjkMark(): Promise<Buffer> {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const isBrandYellow = (i: number) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return r > 220 && g > 150 && g < 220 && b < 80;
  };
  // The /// slashes and AJK letter outlines are dark gray to near-black.
  const isSlashGray = (i: number) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) return false;
    // dark, near-grayscale
    return r < 110 && g < 110 && b < 110 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
  };

  // Find the vertical band of the AJK letters by yellow fill.
  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isBrandYellow((y * width + x) * channels)) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxY <= minY) {
    throw new Error(
      `No brand-yellow pixels found in ${source}. The detection thresholds in ` +
      `isBrandYellow are tuned to #FFC20E; if the source logo's yellow shifted, ` +
      `widen the r/g/b ranges and re-run.`,
    );
  }

  const letterBand = maxY - minY;

  // Per-column counts: yellow alone tracks the AJK letters; mark = yellow
  // OR slash-gray tracks AJK + the slashes (and unfortunately also the
  // subtitle bar / excavator outlines — handled by directional walking).
  const colYellow = new Uint32Array(width);
  const colMark = new Uint32Array(width);
  for (let y = minY; y <= maxY; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isBrandYellow(i)) {
        colYellow[x]++;
        colMark[x]++;
      } else if (isSlashGray(i)) {
        colMark[x]++;
      }
    }
  }

  // Right edge: walk right from the leftmost meaningful yellow column,
  // tolerating gaps up to ~28% of the band height — wide enough to step
  // over the J→K gap (~21% of the band) but tight enough to stop at the
  // next big gap (K → excavator). Track the last column with substantial
  // (>=3 hits) yellow so we don't extend into 1-pixel anti-alias artifacts.
  const yellowStart = findFirstSubstantial(colYellow);
  let ajkRight = yellowStart;
  const ajkGapThreshold = Math.round(letterBand * 0.28);
  let zeroRun = 0;
  for (let x = yellowStart; x < width; x++) {
    if (colYellow[x] >= 3) {
      ajkRight = x;
      zeroRun = 0;
    } else if (colYellow[x] === 0 && ++zeroRun > ajkGapThreshold) {
      break;
    }
  }

  // Left edge: walk left from the AJK letters through the /// slashes,
  // stopping at the first wide white gap (= the empty space before the
  // slashes start). The gap between adjacent slashes is small; 20% of the
  // band height comfortably steps across them but stops at empty space.
  let slashLeft = yellowStart;
  const slashGapThreshold = Math.round(letterBand * 0.20);
  zeroRun = 0;
  for (let x = yellowStart; x >= 0; x--) {
    if (colMark[x] >= 3) {
      slashLeft = x;
      zeroRun = 0;
    } else if (++zeroRun > slashGapThreshold) {
      break;
    }
  }

  const padTop = Math.round(letterBand * 0.08);
  const padRight = 0;                                  // K sits flush with excavator; no pad to the right
  const padBottom = Math.round(letterBand * -0.02);    // crop slightly above maxY to skip the subtitle bar's top edge
  const padLeft = Math.round(letterBand * 0.04);
  const left = Math.max(0, slashLeft - padLeft);
  const top = Math.max(0, minY - padTop);
  const right = Math.min(width, ajkRight + padRight);
  const bottom = Math.min(height, maxY + padBottom);

  return sharp(source)
    .extract({ left, top, width: right - left, height: bottom - top })
    .trim({ background: 'white', threshold: 10 })
    .toBuffer();
}

async function makeIcon(size: number, filename: string, mark: Buffer) {
  const targetWidth = Math.round(size * 0.86);
  const logo = await sharp(mark)
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
  const mark = await getCroppedAjkMark();
  await Promise.all([
    makeIcon(192, 'icon-192.png', mark),
    makeIcon(512, 'icon-512.png', mark),
    makeIcon(180, 'apple-touch-icon.png', mark),
  ]);
}

main().catch((e) => { console.error(e); process.exit(1); });
