import type { APIRoute } from 'astro';
import { stores, storePath, categories, storeCategoryPath } from '../lib/oshen-stores';
import { catalogue as designerCatalogue, designers, designerPath, designerWorks } from '../lib/oshen-designers';
import { catalogue } from '../lib/oshen-stage';
import { stageHallPath, stageVideoPath } from '../../public/puma_oshen_wave/stage/routes.js';
import { designers as yilanDesigners, designerPath as yilanDesignerPath } from '../lib/yilan-market';
import { eventEntries, storyEventPath } from '../lib/story-events';
import { designerWalkPath } from '../../public/designers/js/routes.js';
import { designerWorkPath } from '../../public/designers/js/work-links.js';

const paths = [
  '/',
  '/privacy/',
  '/stores/',
  ...categories.map(storeCategoryPath),
  ...stores.map(({ id }) => storePath(id)),
  '/designers/',
  ...designerCatalogue.index.halls.flatMap(hall => hall.aisles.map(aisle => designerWalkPath(aisle.code))),
  ...designers.map(designer => designerPath(designer.id)),
  ...designerWorks.map(({ designer, work }) => designerWorkPath(designer.id, work.id)),
  '/stage/',
  ...catalogue.halls.map(hall => stageHallPath(hall.id)),
  ...catalogue.stages.map(stage => stageVideoPath(stage.id)),
  '/stories/',
  '/stories/events/',
  ...eventEntries.map(({ id }) => storyEventPath(id)),
  '/puma_oshen_wave/yilan_taiwan_11_07/',
  ...yilanDesigners.map(designer => yilanDesignerPath(designer.id)),
  '/puma_oshen_wave/support/',
  '/puma_oshen_wave/privacy/',
  '/youtube-uploader/',
  '/youtube-uploader/privacy/',
  '/youtube-uploader/terms/',
  '/friends.html',
  '/event/20260909/',
  '/event/20261006/',
  '/event/20261111/',
];

export const GET: APIRoute = ({ site }) => {
  const items = paths.map(path => `  <url><loc>${new URL(path, site).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
