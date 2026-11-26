import type { APIRoute } from 'astro';
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stores, storeCity } from '../../../lib/oshen-stores';

type Store = (typeof stores)[number];
const width = 1200;
const height = 630;
const inset = 68;
const nameSegments = new Intl.Segmenter('zh-TW', { granularity: 'word' });
GlobalFonts.registerFromPath(resolve('scripts/fonts/NotoSansTC-Bold.otf'), 'Store Card');

export function getStaticPaths() {
  return stores.map(store => ({ params: { id: store.id }, props: { store } }));
}

async function storeImage(store: Store) {
  for (const photo of [store.logo, ...store.photos]) {
    if (!photo) continue;
    try {
      const file = resolve('public', '.' + photo.url.pathname);
      return await loadImage(await readFile(file));
    } catch {
      // A missing or unreadable store image still gets a card with its name.
    }
  }
}

function drawName(ctx: SKRSContext2D, name: string, maxWidth: number) {
  const parts = Array.from(nameSegments.segment(name.trim()), part => part.segment);
  let lines: string[] = [];
  let size = 84;
  for (; size >= 32; size -= 4) {
    ctx.font = `bold ${size}px "Store Card"`;
    lines = [''];
    for (const part of parts) {
      const last = lines.length - 1;
      const next = lines[last] + part;
      if (lines[last] && ctx.measureText(next.trimEnd()).width > maxWidth) {
        lines.push(part.trimStart());
      } else {
        lines[last] = next;
      }
    }
    if (lines.length <= 3 && lines.every(line => ctx.measureText(line.trim()).width <= maxWidth)) break;
  }
  const spacing = Math.max(size, 32) * 1.22;
  const first = 328 - (lines.length - 1) * spacing / 2;
  lines.forEach((line, i) => ctx.fillText(line.trim(), inset, first + i * spacing, maxWidth));
}

export const GET: APIRoute = async ({ props }) => {
  const store: Store = props.store;
  const image = await storeImage(store);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f8f3e8';
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9a451e';
  ctx.font = 'bold 34px "Store Card"';
  ctx.fillText('發光的店家', inset, 85);
  ctx.fillStyle = '#c9bba6';
  ctx.fillRect(inset, 138, width - 2 * inset, 2);

  const imageSize = 394;
  const imageLeft = width - inset - imageSize;
  if (image) {
    const scale = Math.min(imageSize / image.width, imageSize / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, imageLeft + (imageSize - w) / 2, 360 - h / 2, w, h);
  }
  ctx.fillStyle = '#29241f';
  drawName(ctx, store.name, image ? imageLeft - inset - 44 : width - 2 * inset);
  ctx.font = 'bold 34px "Store Card"';
  ctx.fillStyle = '#66584b';
  ctx.fillText([storeCity(store.address), store.category].filter(Boolean).join(' · '), inset, 535);

  return new Response(new Uint8Array(await canvas.encode('webp', 90)), {
    headers: { 'Content-Type': 'image/webp' },
  });
};
