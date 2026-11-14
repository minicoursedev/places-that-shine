import type { APIRoute } from 'astro';
import { designers, designerPath, designerWorks } from '../lib/oshen-designers';
import { catalogue, hallPath, stagePath } from '../lib/oshen-stage';
import { designers as yilanDesigners, designerPath as yilanDesignerPath } from '../lib/yilan-market';
import { hallPages } from '../../public/designers/js/hall-pages.js';
import { designerWorkPath } from '../../public/designers/js/work-links.js';

const paths = [
  '/',
  '/designers/periods/',
  '/designers/',
  ...hallPages.map(hall => hall.path),
  ...designers.map(designer => designerPath(designer.id)),
  ...designerWorks.map(({ designer, work }) => designerWorkPath(designer.id, work.id)),
  '/stage/',
  '/puma_oshen_wave/stage/',
  ...catalogue.halls.map(hall => hallPath(hall.id)),
  ...catalogue.stages.map(stage => stagePath(stage.id)),
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
