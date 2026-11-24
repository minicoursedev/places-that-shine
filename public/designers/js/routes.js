import { designerMetadata, designerStructuredData, serializeStructuredData, publicUrl } from './profile-seo.js?v=20261124-profile-title';
import { hallPageForCode, hallPageForPath } from './hall-pages.js?v=20261124-hall-seo';
import { browserOrigin } from './config.js';

export const designerRoot = '/designers/';
export const designerPath = (id, hall) =>
  `${designerRoot}${encodeURIComponent(id)}/${hall ? `?hall=${encodeURIComponent(hall)}` : ''}`;
export const designerSharePath = (id, hall) => `${designerPath(id)}at/${encodeURIComponent(hall)}/`;
const defaultHall = hallPageForCode('O');
export const designerHallRoot = code => (hallPageForCode(code) || defaultHall).path;
export { hallPageForPath };
export function designerWalkPath(code, boothId = null) {
  const hall = hallPageForCode(code?.[0]) || defaultHall;
  const target = boothId || code;
  if (!target || (!boothId && code === `${hall.code}01`)) return hall.path;
  return `${hall.path}#/walk/${target}`;
}
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
  const hall = hallPageForPath(url.pathname);
  if (hall && !mode) return { mode: 'walk', target: `${hall.code}01`, then: undefined };
  return { mode, target, then };
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
  const hall = hallPageForPath(location.pathname) || defaultHall;
  const metadata = designer && designerMetadata(designer);
  const title = metadata ? metadata.title : hall.title;
  const shareTitle = metadata ? metadata.shareTitle : title;
  const description = metadata ? metadata.description : hall.description;
  const canonical = new URL(designer ? designerPath(designer.id) : hall.path, browserOrigin()).href;
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const onSharePath = designer && location.pathname.startsWith(`${designerPath(designer.id)}at/`);
  const socialUrl = onSharePath ? new URL(location.pathname, browserOrigin()).href : canonical;
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
