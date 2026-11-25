import { createCanvas, DOMMatrix, GlobalFonts } from '@napi-rs/canvas';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import data from '../../public/puma_oshen_wave/stage/videos.json';
import { createCatalogue, createPublicShowcase } from '../../public/puma_oshen_wave/stage/data.js';
import { createWalkView } from '../../public/puma_oshen_wave/designer/js/walk.js';

const catalogue = createCatalogue(data);
export const stageOpeningHalls = catalogue.halls.map(hall => hall.id);
const publicShowcase = createPublicShowcase(catalogue, {
  random: (() => {
    let seed = 20261125;
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  })(),
});

export function stageSceneFor(hallId: string) {
  const aisle = hallId === 'public-stage'
    ? publicShowcase.aisles[0] : catalogue.aisles.find(item => item.hall === hallId);
  if (!aisle) throw new Error(`Missing opening aisle for stage hall ${hallId}`);
  const videos = hallId === 'public-stage'
    ? publicShowcase.stages : catalogue.stages.filter(stage => stage.aisleCode === aisle.code);
  return {
    aisle,
    videos,
    entryStageIds: hallId === 'public-stage' ? videos.map(video => video.id) : undefined,
    nextAisle: catalogue.aisles.find(item => item.hall === hallId && item.code !== aisle.code)?.code,
  };
}

export const stageOpeningViews = [
  { key: 'desktop', width: 1360, height: 810, bleedX: 750, bleedY: 315, media: '(min-width: 1025px)' },
  { key: 'wide', width: 2304, height: 1320, bleedX: 980, bleedY: 320, media: '(min-width: 1800px)' },
  { key: 'tablet', width: 820, height: 1090, bleedX: 850, bleedY: 370, media: '(max-width: 1024px)' },
  { key: 'phone', width: 390, height: 806, bleedX: 620, bleedY: 245, media: '(max-width: 560px)' },
  { key: 'short', width: 844, height: 353, bleedX: 800, bleedY: 140, media: '(orientation: landscape) and (max-width: 1024px) and (max-height: 532px)' },
];

const root = process.cwd();
const styles = readFileSync(join(root, 'public/puma_oshen_wave/designer/css/market.css'), 'utf8');
const colors = new Map([...styles.matchAll(/(--[\w-]+):\s*(#[\da-f]+);/gi)].map(match => [match[1], match[2]]));
const palette = { getPropertyValue: (name: string) => colors.get(name) || '' };
for (const file of ['NotoSansTC-Regular.otf', 'NotoSansTC-Bold.otf']) {
  GlobalFonts.registerFromPath(join(root, 'scripts/fonts', file), 'Noto Sans TC');
}

type View = typeof stageOpeningViews[number];
export const stageOpeningFrameName = (hallId: string, view: View) => `${hallId}-${view.key}`;

async function render(hallId: string, view: View) {
  const { aisle, nextAisle } = stageSceneFor(hallId);
  const canvas = createCanvas(1, 1);
  const opening = {
    ...view, aisle, neighbors: { next: nextAisle }, palette, Matrix: DOMMatrix,
    makeCanvas: () => createCanvas(1, 1),
  };
  // The live stage and the static background use the same geometry and drawing code.
  const renderOpening = createWalkView as unknown as (
    canvas: ReturnType<typeof createCanvas>,
    options: { opening: typeof opening; display: 'stage'; visited: () => boolean },
  ) => { x: number; y: number; width: number; height: number };
  const bounds = renderOpening(canvas, { opening, display: 'stage', visited: () => false });
  const image = await canvas.encode('webp', 90);
  canvas.width = canvas.height = 1;
  const version = createHash('sha256').update(image).digest('hex').slice(0, 12);
  return { bounds, image, url: `/stage/openings/${stageOpeningFrameName(hallId, view)}.webp?v=${version}` };
}

const frames = new Map<string, ReturnType<typeof render>>();
// HTML pages and the image endpoints request the same frames, one surface at a time.
let nextRender = Promise.resolve();
export function stageOpeningFrame(hallId: string, view: View) {
  const name = stageOpeningFrameName(hallId, view);
  const cached = frames.get(name);
  if (cached) return cached;
  const frame = nextRender.then(() => render(hallId, view));
  frames.set(name, frame);
  nextRender = frame.then(() => {}, () => { frames.delete(name); });
  return frame;
}
