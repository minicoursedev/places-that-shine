import { STORE_ID } from './oshen-store-links.mjs';

const PHOTO_PATH = /^\/media\/library\/[a-z0-9-]+\/[\w.-]+\.(?:avif|gif|jpe?g|png|webp)$/i;
const SOCIALS = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram.svg' },
  { key: 'facebook', label: 'Facebook', icon: 'facebook.webp' },
  { key: 'threads', label: 'Threads', icon: 'threads.svg' },
  { key: 'website', label: '官網', icon: 'website.svg' },
];

function asRecord(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readText(value: unknown) {
  return hasText(value) ? value : undefined;
}

function readHttpsUrl(value: unknown) {
  if (!hasText(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url;
  } catch {
    return undefined;
  }
}

function readPhoto(value: unknown, base: URL) {
  const photo = asRecord(value);
  if (!photo || !hasText(photo.url)) return;

  try {
    const url = new URL(photo.url, base);
    if (url.origin !== base.origin || url.username || url.password || !PHOTO_PATH.test(url.pathname)) return;
    return { url, alt: readText(photo.alt)?.trim(), caption: readText(photo.caption)?.trim() };
  } catch {
    return undefined;
  }
}

function readHours(value: unknown) {
  const hours = asRecord(value);
  if (!hours || !hasText(hours.text)) return;

  const { status, text } = hours;
  if (status !== 'verified' && status !== 'reference' && status !== 'appointment') return;
  const label = status === 'reference' ? '營業時間（參考）' : '營業時間與預約';
  return { label, text, note: readText(hours.note) };
}

function readCoordinates(value: unknown) {
  const point = asRecord(value);
  const lat = point?.lat;
  const lng = point?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
  return { lat, lng };
}

function readStore(value: unknown, base: URL) {
  const store = asRecord(value);
  if (!store || store.disabled === true) return;

  const { id, name, address, category } = store;
  if (typeof id !== 'string' || !STORE_ID.test(id) || !hasText(name) || !hasText(address) || !hasText(category)) return;

  const shopPhoto = asRecord(store.shopPhoto);
  const social = asRecord(store.social);
  const productImages = Array.isArray(store.productImages) ? store.productImages : [];
  const visitRecords = Array.isArray(store.visitRecords) ? store.visitRecords : [];

  return {
    id, name, address, category,
    serviceType: readText(store.serviceType),
    latlng: readCoordinates(store.latlng),
    mapMarker: store.mapMarker,
    verification: store.verification,
    openingHours: readHours(store.openingHours),
    visitNote: readText(store.visitNote),
    visitUrl: readHttpsUrl(store.visitUrl),
    socialLinks: SOCIALS.flatMap(({ key, label, icon }) => {
      const url = readHttpsUrl(social?.[key]);
      return url ? [{ label, icon, url }] : [];
    }),
    logo: shopPhoto?.status === 'verified' ? readPhoto(shopPhoto, base) : undefined,
    photos: productImages.flatMap(entry => {
      const photo = readPhoto(entry, base);
      return photo ? [{ ...photo, alt: photo.alt ?? `${name}的店家照片` }] : [];
    }),
    visitRecords: visitRecords.flatMap(entry => {
      const record = asRecord(entry);
      if (!record || !hasText(record.excerpt)) return [];
      return [{
        excerpt: record.excerpt,
        author: readText(record.author),
        source: readText(record.source),
        url: readHttpsUrl(record.url),
        photo: readPhoto(record.photo, base),
      }];
    }),
  };
}

export function readStores(value: unknown, site: string) {
  const entries = asRecord(value)?.stores;
  if (!Array.isArray(entries)) throw new Error('店家資料格式不正確');

  const base = new URL('/', site);
  return entries.flatMap(entry => {
    const store = readStore(entry, base);
    return store ? [store] : [];
  });
}
