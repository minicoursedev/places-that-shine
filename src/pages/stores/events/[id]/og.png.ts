import type { APIRoute } from 'astro';
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stores } from '../../../../lib/oshen-stores';
import { storeEvents } from '../../../../lib/store-events.js';

const width = 1200;
const height = 630;
const inset = 80;

GlobalFonts.registerFromPath(resolve('scripts/fonts/NotoSansTC-Bold.otf'), 'Store Event');

export function getStaticPaths() {
  return storeEvents.map(event => {
    const ids = new Set(event.groups.flatMap(group => group.storeIds));
    return {
      params: { id: event.id },
      props: { name: event.name, count: stores.filter(store => ids.has(store.id)).length },
    };
  });
}

function drawTitle(ctx: SKRSContext2D, title: string) {
  const characters = Array.from(new Intl.Segmenter('zh-TW', { granularity: 'grapheme' }).segment(title), part => part.segment);
  let size = 132;
  let lines: string[];
  do {
    ctx.font = `bold ${size}px "Store Event"`;
    lines = [''];
    for (const character of characters) {
      const last = lines.length - 1;
      if (lines[last] && ctx.measureText(lines[last] + character).width > width - 2 * inset) lines.push(character);
      else lines[last] += character;
    }
    if (lines.length * size * 1.24 <= 270 || size <= 12) break;
    size -= 4;
  } while (true);
  const spacing = size * 1.24;
  const first = 320 - (lines.length - 1) * spacing / 2;
  ctx.fillStyle = '#fff8e8';
  lines.forEach((line, i) => ctx.fillText(line, inset, first + i * spacing));
}

export const GET: APIRoute = async ({ params, props }) => {
  const headers = { 'Content-Type': 'image/png' };
  const poster = resolve('src/assets/store-events', `${params.id}.png`);
  if (existsSync(poster)) return new Response(new Uint8Array(await readFile(poster)), { headers });

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const photo = await loadImage(resolve('public/media/tainan-evening.webp'));
  const cropWidth = photo.height * width / height;
  ctx.drawImage(photo, (photo.width - cropWidth) / 2, 0, cropWidth, photo.height, 0, 0, width, height);
  const shade = ctx.createLinearGradient(0, 0, width, 0);
  shade.addColorStop(0, 'rgba(8, 15, 18, .86)');
  shade.addColorStop(.6, 'rgba(8, 15, 18, .63)');
  shade.addColorStop(1, 'rgba(8, 15, 18, .24)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px "Store Event"';
  ctx.fillStyle = '#ffd390';
  ctx.fillText('發光的店家', inset, 116);
  drawTitle(ctx, props.name);
  ctx.font = 'bold 38px "Store Event"';
  ctx.fillStyle = '#fff8e8';
  ctx.fillText(`${props.count} 間參與店家`, inset, 514);

  return new Response(new Uint8Array(await canvas.encode('png')), { headers });
};
