import { designerMetadata, designerStructuredData, serializeStructuredData, publicUrl } from './profile-seo.js?v=20261124-profile-title';
import { hallPageForCode, hallPageForPath as hallRootForPath } from './hall-pages.js?v=20261126-vote-hall';
import { browserOrigin } from './config.js';

export const designerRoot = '/designers/';
export const designerPath = (id, hall) =>
  `${designerRoot}${encodeURIComponent(id)}/${hall ? `?hall=${encodeURIComponent(hall)}` : ''}`;
export const designerSharePath = (id, hall) => `${designerPath(id)}at/${encodeURIComponent(hall)}/`;
const defaultHall = hallPageForCode('O');
export const designerHallRoot = code => (hallPageForCode(code) || defaultHall).path;
function hallLocation(pathname) {
  const hall = hallRootForPath(pathname);
  if (hall) return { hall, aisle: `${hall.code}01` };
  const match = pathname.match(/^(.*\/)([a-z]\d{2})\/?$/);
  if (!match) return null;
  const parent = hallRootForPath(match[1]);
  const aisle = match[2].toUpperCase();
  return parent?.code === aisle[0] ? { hall: parent, aisle } : null;
}
export const hallPageForPath = pathname => hallLocation(pathname)?.hall || null;
export const designerAisleTitle = (hall, code) => code && code !== `${hall.code}01`
  ? `${hall.name} ${code} 走道｜發光的地方` : hall.title;
export function designerWalkPath(code, boothId = null) {
  const hall = hallPageForCode(code?.[0]) || defaultHall;
  const path = !code || code === `${hall.code}01` ? hall.path : `${hall.path}${code.toLowerCase()}/`;
  return boothId ? `${path}?booth=${encodeURIComponent(boothId)}` : path;
}
export const designerViewPath = (code, mode) => `${designerWalkPath(code)}?view=${mode}`;
export function designerBoothUrl(id, base = browserOrigin()) {
  return new URL(designerPath(id), base).href;
}
// A shared profile URL owns the initial view, even with a stale walk hash.
export function resolveDesignerRoute(url, { boot = false } = {}) {
  const [mode, target, then] = url.hash.replace(/^#\/?/, '').split('/');
  const profile = url.pathname.match(/^\/designers\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/at\/([A-Z]))?\/?$/);
  if (profile && (boot || !mode)) {
    const hall = profile[2] || url.searchParams.get('hall');
    return { mode: 'designer', target: decodeURIComponent(profile[1]), ...(hall && { hall }) };
  }
  const aisle = hallLocation(url.pathname)?.aisle;
  if (mode === 'list' || mode === 'map') return { mode, target: aisle };
  if (mode) return { mode, target, then };
  if (!aisle) return { mode, target, then };
  const view = url.searchParams.get('view');
  if (view === 'list' || view === 'map') return { mode: view, target: aisle };
  const booth = url.searchParams.get('booth');
  if (/^[A-Z]\d{2}-\d{2}$/.test(booth) && booth.startsWith(aisle + '-')) {
    return { mode: 'walk', target: booth, then: url.searchParams.get('open') === '1' ? 'open' : undefined };
  }
  return { mode: 'walk', target: aisle, then: undefined };
}
const exhibitionImage = '/designers/assets/exhibition-og.webp';
const initialPreview = typeof document === 'undefined' ? null : {
  id: document.documentElement.dataset.designerProfile,
  image: document.querySelector('meta[property="og:image"]')?.content,
  alt: document.querySelector('meta[property="og:image:alt"]')?.content,
  width: document.querySelector('meta[property="og:image:width"]')?.content,
  height: document.querySelector('meta[property="og:image:height"]')?.content,
  type: document.querySelector('meta[property="og:image:type"]')?.content,
};

export function updateDesignerMetadata(designer = null, booth = {}) {
  const { hall, aisle } = hallLocation(location.pathname) || { hall: defaultHall };
  const metadata = designer && designerMetadata(designer);
  const title = metadata ? metadata.title : designerAisleTitle(hall, aisle);
  const shareTitle = metadata ? metadata.shareTitle : title;
  const description = metadata ? metadata.description : hall.description;
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const canonical = new URL(designer ? designerPath(designer.id) : designerWalkPath(aisle), canonicalLink?.href || browserOrigin()).href;
  const onSharePath = designer && location.pathname.startsWith(`${designerPath(designer.id)}at/`);
  const socialUrl = onSharePath ? new URL(location.pathname, canonical).href : canonical;
  document.title = title;
  if (canonicalLink) canonicalLink.href = canonical;
  for (const [attribute, key, value] of [['name', 'description', description], ['property', 'og:title', shareTitle], ['property', 'og:description', description], ['property', 'og:url', socialUrl], ['name', 'twitter:title', shareTitle], ['name', 'twitter:description', description]]) {
    let tag = document.querySelector(`meta[${attribute}="${key}"]`);
    if (!value) { tag?.remove(); continue; }
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attribute, key); document.head.append(tag); }
    tag.content = value;
  }
  const avatar = publicUrl(designer?.avatar, canonical);
  let preview = hall;
  if (designer) {
    if (designer.og) preview = { ...designer.og, image: designer.og.url };
    else if (initialPreview?.id === designer.id) preview = initialPreview;
    else if (avatar) preview = { image: avatar };
    else preview = { image: exhibitionImage, width: '2622', height: '1206', type: 'image/webp' };
  }
  const image = publicUrl(preview.image, canonical) || new URL(exhibitionImage, canonical).href;
  const imageAlt = preview.alt || (designer && avatar ? `${designer.name}的頭像` : '發光的設計師市集逛攤畫面');
  document.querySelector('meta[name="twitter:card"]').content = designer ? 'summary' : 'summary_large_image';
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) document.querySelector(selector).content = image;
  for (const selector of ['meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]']) document.querySelector(selector).content = imageAlt;
  for (const key of ['width', 'height', 'type']) {
    const selector = `meta[property="og:image:${key}"]`;
    let tag = document.querySelector(selector);
    if (!preview[key]) { tag?.remove(); continue; }
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute('property', `og:image:${key}`); document.head.append(tag); }
    tag.content = preview[key];
  }
  let structuredData = document.getElementById('designer-structured-data');
  if (!designer) { structuredData?.remove(); return; }
  if (!structuredData) {
    structuredData = document.createElement('script');
    structuredData.id = 'designer-structured-data';
    structuredData.type = 'application/ld+json';
    document.head.append(structuredData);
  }
  structuredData.textContent = serializeStructuredData(designerStructuredData(designer, booth, canonical, new URL(designerRoot, canonical).href, metadata));
}
