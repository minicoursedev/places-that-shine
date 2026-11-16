// Build the walk, map and search views from the shared local catalogue.
import { CONFIG, resolveAsset } from './config.js';
import { inlineWorkId } from './work-links.js';

const HALLS = [
  { code: 'O', name: '洋流設計師館', category: '設計師', zone: { code: 'DESIGNERS', name: '設計師' } },
  { code: 'A', name: '洋流愛好者館', category: '愛好者', zone: { code: 'AMATEURS', name: '愛好者' } },
  { code: 'W', name: '洋流網站館', category: '設計師', zone: { code: 'WEBSITES', name: '網站' } },
  { code: 'S', name: '鏟子超人館', category: '設計師', zone: { code: 'SHOVEL-HEROES', name: '鏟子超人' } },
  { code: 'B', name: '青鳥行動', year: 2024, category: '設計師', zone: { code: 'BLUEBIRD-ACTION', name: '青鳥行動' } },
];
const PER_ISLAND = 8;
const PER_AISLE = PER_ISLAND * 2;
const pad2 = n => String(n).padStart(2, '0');
const primaryHall = designer => {
  if (HALLS.some(hall => hall.code === designer.hall)) return designer.hall;
  return designer.category === '愛好者' ? 'A' : 'O';
};
export const designerHallCodes = designer => [primaryHall(designer), ...(designer.additionalHalls || [])];
export const isOshenHall = code => code === 'O' || code === 'A';

function externalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

// Image provenance is not a product page. Uploaded files stay non-clickable.
function productLink(product) {
  const source = externalUrl(product?.source);
  if (!source) return '';
  const url = new URL(source);
  if (source === product?.url || source === product?.originalUrl
    || /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)
    || /(^|\.)(?:discordapp\.(?:com|net)|discord\.com|fbcdn\.net|cdninstagram\.com)$/.test(url.hostname)) return '';
  return source;
}

export function createCatalogue(data, { baseUrl = CONFIG.DESIGNERS_URL, ogImages = {} } = {}) {
  const imageUrl = value => resolveAsset(value, baseUrl);
  if (!Array.isArray(data?.designers)) throw new Error('Invalid designer list');
  const ids = new Set();
  for (const designer of data.designers) {
    if (!designer || typeof designer.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(designer.id)
      || ids.has(designer.id) || typeof designer.name !== 'string' || !designer.name.trim()) {
      throw new Error('Invalid designer record');
    }
    ids.add(designer.id);
  }
  const designers = data.designers.filter(d => d.disabled !== true);
  const aisles = new Map();
  const designerBooths = new Map();
  const hallBoothsByDesigner = new Map();
  const search = [];
  const halls = [];

  for (const HALL of HALLS) {
    const ZONE = HALL.zone;
    const hallDesigners = designers.filter(designer => designerHallCodes(designer).includes(HALL.code));
    const summaries = [];
    // Keep one empty aisle in each hall, including before its first author is listed.
    for (let start = 0; start < Math.max(1, hallDesigners.length); start += PER_AISLE) {
      const code = `${HALL.code}${pad2(start / PER_AISLE + 1)}`;
      const members = hallDesigners.slice(start, start + PER_AISLE);
      const stores = {};
      const booths = members.map((designer, pos) => {
        const id = `${code}-${pad2(pos + 1)}`;
        const category = ['設計師', '創作者', '愛好者'].includes(designer.category) ? designer.category : HALL.category;
        if (HALL.code === primaryHall(designer)) designerBooths.set(designer.id, id);
        const hallBooths = hallBoothsByDesigner.get(designer.id) || [];
        hallBooths.push({ id, aisle: code, hall: HALL.year ? `${HALL.year} ${HALL.name}` : HALL.name });
        hallBoothsByDesigner.set(designer.id, hallBooths);
        const social = Object.fromEntries(Object.entries(designer.social || {})
          .map(([key, value]) => [key, externalUrl(value)]));
        const works = (Array.isArray(designer.productImages) ? designer.productImages : [])
          .map((product, i) => ({
            id: inlineWorkId(designer.id, product),
            name: typeof product?.alt === 'string' && product.alt.trim() ? product.alt : `${designer.name} 作品參考 ${i + 1}`,
            caption: typeof product?.caption === 'string' ? product.caption : '',
            cover: imageUrl(product?.url),
            thumbnail: product?.thumbnail,
            video: imageUrl(product?.videoUrl),
            url: productLink(product),
          })).filter((work, i) => work.cover && designer.productImages[i]?.disabled !== true);
        stores[designer.id] = {
          id: designer.id, name: designer.name, owner: designer.name, category,
          description: typeof designer.description === 'string' ? designer.description.trim() : '',
          entityType: ['Person', 'Organization'].includes(designer.entityType) ? designer.entityType : '',
          og: ogImages[designer.id] || null,
          avatar: designer.logo?.status === 'verified' ? imageUrl(designer.logo.url) : '',
          avatarFit: designer.logo?.fit === 'contain' ? 'contain' : 'cover',
          productsUrl: imageUrl(designer.productsUrl),
          links: (Array.isArray(designer.links) ? designer.links : []).map((link, index) => ({
            url: externalUrl(typeof link === 'string' ? link : link?.url),
            label: typeof link?.label === 'string' && link.label.trim() ? link.label : `連結 ${index + 1}`,
          })).filter(link => link.url),
          social, verification: designer.verification === true, booths: 1,
        };
        search.push([id, designer.name, designer.name, category, HALL.code, '']);
        return {
          id, pos: pos % PER_ISLAND, store: designer.id,
          corner: pos % PER_ISLAND === 0 || pos % PER_ISLAND === PER_ISLAND - 1 || pos === members.length - 1,
          zone: ZONE.code, zoneName: category, type: '',
          works, total: works.length, hallBooths,
        };
      });
      const islands = ['N', 'S'].map((side, i) => ({
        side, zone: ZONE.code, zoneName: ZONE.name,
        booths: booths.slice(i * PER_ISLAND, (i + 1) * PER_ISLAND),
      })).filter(island => island.booths.length);
      aisles.set(code, { code, hall: HALL.code, hallName: HALL.name, islands, stores });
      summaries.push({
        code, booths: booths.length, zones: booths.length ? [ZONE.name] : [],
        islands: islands.map(island => ({
          side: island.side, zone: island.zone, n: island.booths.length,
          corners: island.booths.map(booth => booth.corner),
        })),
      });
    }
    halls.push({
      code: HALL.code, name: HALL.name, aisles: summaries,
      zones: hallDesigners.length ? [{ ...ZONE, booths: hallDesigners.length, aisles: summaries.map(a => a.code) }] : [],
    });
  }
  return {
    index: {
      halls,
      totals: { designers: designers.length, booths: search.length },
    },
    aisles, search, designerBooths, hallBoothsByDesigner,
  };
}

let catalogue = null;
function loadCatalogue() {
  if (!catalogue) {
    const designers = fetch(CONFIG.DESIGNERS_URL, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Could not load designer.json: HTTP ${response.status}`);
        return response.json();
      });
    const previews = fetch(new URL('../og-images.json', import.meta.url), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : {}).catch(() => ({}));
    catalogue = Promise.all([designers, previews])
      .then(([data, ogImages]) => createCatalogue(data, { ogImages }))
      .catch(error => { catalogue = null; throw error; });
  }
  return catalogue;
}

export const aisleOfBooth = boothId => boothId.split('-')[0];
export const hallOf = code => code[0];
export const loadIndex = async () => (await loadCatalogue()).index;
export async function loadBoothForDesigner(id, hall) {
  const { designerBooths, hallBoothsByDesigner } = await loadCatalogue();
  if (!hall) return designerBooths.get(id) || null;
  const booths = hallBoothsByDesigner.get(id) || [];
  return (booths.find(booth => hallOf(booth.aisle) === hall) || booths[0])?.id || null;
}
export async function loadAisle(code) {
  const aisle = (await loadCatalogue()).aisles.get(code);
  if (!aisle) throw Object.assign(new Error('Aisle not found'), { status: 404 });
  return aisle;
}
export const loadSearch = async () => (await loadCatalogue()).search;
