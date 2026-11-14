// Optional per-designer catalogues. Fetch on opening a profile; sample again on every visit.
import { resolveAsset } from './config.js';

const catalogues = new Map();
export const PRODUCT_LIMIT = 20;

export function readProducts(data, designerId, baseUrl) {
  if (data?.designerId !== designerId || !Array.isArray(data.products)) throw new Error('Invalid product catalogue');
  const ids = new Set(), images = new Set();
  return data.products.flatMap(product => {
    if (!product || product.disabled === true) return [];
    const cover = resolveAsset(product.url, baseUrl);
    const id = typeof product.id === 'string' ? product.id.trim() : '';
    if (!id || !cover || ids.has(id) || images.has(cover)) return [];
    ids.add(id); images.add(cover);
    return [{
      id, cover, name: typeof product.alt === 'string' ? product.alt : '',
      caption: typeof product.caption === 'string' ? product.caption : '',
      pinned: product.pinned === true,
      width: Number.isInteger(product.width) && product.width > 0 ? product.width : 800,
      height: Number.isInteger(product.height) && product.height > 0 ? product.height : 800,
      video: resolveAsset(product.videoUrl, baseUrl), url: resolveAsset(product.link, baseUrl),
    }];
  });
}

export function sampleProducts(products, random = Math.random) {
  const pinned = products.filter(product => product.pinned === true);
  const shuffled = products.filter(product => product.pinned !== true);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return pinned.concat(shuffled).slice(0, PRODUCT_LIMIT);
}

export async function loadProducts(url, designerId) {
  const key = `${designerId}|${url}`;
  if (!catalogues.has(key)) {
    catalogues.set(key, fetch(url, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Could not load products: HTTP ${response.status}`);
        return response.json();
      })
      .then(data => readProducts(data, designerId, url))
      .catch(error => { catalogues.delete(key); throw error; }));
  }
  return catalogues.get(key);
}
