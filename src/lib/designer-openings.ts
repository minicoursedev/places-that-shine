import { createCanvas, DOMMatrix, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { readBundledSource } from '../../scripts/designer-og.mjs';
import data from '../../public/data/oshen-designers.json';
import { createCatalogue, isOshenHall } from '../../public/designers/js/data.js';
import { createWalkView } from '../../public/designers/js/walk.js';
import { placeIslands, DESIGNER_BOOTH_WIDTH } from '../../public/designers/js/walk-layout.js';

const catalogue = createCatalogue(data);
export const hallCodes = catalogue.index.halls.map(h => h.code);
export const openingViews = [
  { key: 'wide', width: 1360, height: 840, bleedX: 640, bleedY: 320, media: '(orientation: landscape)' },
  { key: 'large', width: 2560, height: 1440, bleedX: 1280, bleedY: 500, media: '(orientation: landscape) and (min-width: 1800px)' },
  { key: 'short', width: 844, height: 390, bleedX: 760, bleedY: 0, media: '(orientation: landscape) and (max-height: 499px)' },
  { key: 'tablet', width: 820, height: 1180, bleedX: 360, bleedY: 380, media: '(orientation: portrait) and (min-width: 561px)' },
  { key: 'tall', width: 1100, height: 1420, bleedX: 760, bleedY: 580, media: '(orientation: portrait) and (min-width: 1025px)' },
  { key: 'phone', width: 390, height: 844, bleedX: 260, bleedY: 120, media: '(orientation: portrait) and (max-width: 560px)' },
];

const root = process.cwd();
const styles = readFileSync(join(root, 'public/designers/css/market.css'), 'utf8');
const colors = new Map([...styles.matchAll(/(--[\w-]+):\s*(#[\da-f]+);/gi)].map(m => [m[1], m[2]]));
const palette = { getPropertyValue: (name: string) => colors.get(name) || '' };
for (const file of ['NotoSansTC-Regular.otf', 'NotoSansTC-Bold.otf']) {
  GlobalFonts.registerFromPath(join(root, 'scripts/fonts', file), 'Noto Sans TC');
}

function firstAisle(code: string) {
  return catalogue.aisles.get(code + '01');
}

export function openingWorldStyle(code: string) {
  const { islands } = firstAisle(code);
  const width = (landscape: boolean) => placeIslands(islands, landscape, DESIGNER_BOOTH_WIDTH).worldW;
  return `--portrait-width:${width(false)};--landscape-width:${width(true)}`;
}

type Artwork = Map<string, Awaited<ReturnType<typeof loadImage>>>;
async function loadArtwork(code: string): Promise<Artwork> {
  const aisle = firstAisle(code);
  const urls = new Map<string, string>();
  for (const island of aisle.islands) {
    for (const booth of island.booths) {
      for (const url of [aisle.stores[booth.store].avatar, ...booth.works.slice(0, 2).map(work => work.cover)]) {
        if (url) urls.set(url, booth.store);
      }
    }
  }
  const images: Artwork = new Map();
  await Promise.all([...urls].map(async ([url, designerId]) => {
    const input = await readBundledSource(url, join(root, 'public'), import.meta.env.SITE, designerId);
    if (!input) return;
    const bytes = await sharp(input).rotate().resize({ height: 360, withoutEnlargement: true }).png().toBuffer();
    images.set(url, await loadImage(bytes));
  }));
  return images;
}

const pendingArt = new Map<string, Promise<Artwork>>();
function artwork(code: string) {
  if (!pendingArt.has(code)) pendingArt.set(code, loadArtwork(code));
  return pendingArt.get(code)!;
}

async function render(code: string, view: typeof openingViews[number]) {
  const aisle = firstAisle(code);
  const halls = catalogue.index.halls.filter(hall => isOshenHall(code) ? isOshenHall(hall.code) : hall.code === code);
  const aisles = halls.flatMap(hall => hall.aisles.map(item => ({ code: item.code, hall })));
  const index = aisles.findIndex(item => item.code === aisle.code);
  const prev = aisles[index - 1], next = aisles[index + 1];
  const neighbors = {
    prev: prev?.code, next: next?.code,
    prevLabel: prev && prev.hall.code !== code ? `← 往${prev.hall.name}` : '',
    nextLabel: next && next.hall.code !== code ? `往${next.hall.name} →` : '',
  };
  const canvas = createCanvas(1, 1);
  const opening = { ...view, aisle, neighbors, palette, images: await artwork(code), Matrix: DOMMatrix, makeCanvas: () => createCanvas(1, 1) };
  const bounds = createWalkView(canvas, { opening, visited: () => false, omitNameplates: true });
  const image = await canvas.encode('webp', 90);
  const version = createHash('sha256').update(image).digest('hex').slice(0, 12);
  return { bounds, image, url: `/designers/openings/${code}-${view.key}.webp?v=${version}` };
}

const frames = new Map<string, ReturnType<typeof render>>();
export function openingFrame(code: string, view: typeof openingViews[number]) {
  const key = code + view.key;
  if (!frames.has(key)) frames.set(key, render(code, view));
  return frames.get(key)!;
}
