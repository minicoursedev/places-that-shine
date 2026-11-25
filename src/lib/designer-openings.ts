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
export const openingAisles = catalogue.index.halls.flatMap(hall => hall.aisles.map(aisle => aisle.code));
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

export function openingFrameName(code: string, view: typeof openingViews[number]) {
  return `${code.replace(/01$/, '')}-${view.key}`;
}

export function openingWorldStyle(code: string) {
  const { islands } = catalogue.aisles.get(code);
  const width = (landscape: boolean) => placeIslands(islands, landscape, DESIGNER_BOOTH_WIDTH).worldW;
  return `--portrait-width:${width(false)};--landscape-width:${width(true)}`;
}

type Artwork = Map<string, Awaited<ReturnType<typeof loadImage>>>;
async function loadArtwork(code: string): Promise<Artwork> {
  const aisle = catalogue.aisles.get(code);
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

let currentArt: { code: string; images: Artwork } | undefined;
async function render(code: string, view: typeof openingViews[number]) {
  const aisle = catalogue.aisles.get(code);
  const halls = catalogue.index.halls.filter(hall => isOshenHall(aisle.hall) ? isOshenHall(hall.code) : hall.code === aisle.hall);
  const aisles = halls.flatMap(hall => hall.aisles.map(item => ({ code: item.code, hall })));
  const index = aisles.findIndex(item => item.code === aisle.code);
  const prev = aisles[index - 1], next = aisles[index + 1];
  const neighbors = {
    prev: prev?.code, next: next?.code,
    prevLabel: prev && prev.hall.code !== aisle.hall ? `← 往${prev.hall.name}` : '',
    nextLabel: next && next.hall.code !== aisle.hall ? `往${next.hall.name} →` : '',
  };
  if (currentArt?.code !== code) currentArt = { code, images: await loadArtwork(code) };
  const canvas = createCanvas(1, 1);
  const opening = { ...view, aisle, neighbors, palette, images: currentArt.images, Matrix: DOMMatrix, makeCanvas: () => createCanvas(1, 1) };
  const bounds = createWalkView(canvas, { opening, visited: () => false, omitNameplates: true });
  const image = await canvas.encode('webp', 90);
  canvas.width = canvas.height = 1;
  const version = createHash('sha256').update(image).digest('hex').slice(0, 12);
  return { bounds, image, url: `/designers/openings/${openingFrameName(code, view)}.webp?v=${version}` };
}

const frames = new Map<string, ReturnType<typeof render>>();
// Both the HTML pages and image routes request frames. Keep only one full-size
// drawing surface active, and retain only encoded WebPs for repeat requests.
let nextRender = Promise.resolve();
export function openingFrame(code: string, view: typeof openingViews[number]) {
  const key = openingFrameName(code, view);
  const cached = frames.get(key);
  if (cached) return cached;
  const frame = nextRender.then(() => render(code, view));
  frames.set(key, frame);
  nextRender = frame.then(() => {}, () => { frames.delete(key); });
  return frame;
}
