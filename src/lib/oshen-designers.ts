import data from '../../public/data/oshen-designers.json';
import ogImages from 'designer-og-manifest';
import { createCatalogue, designerHallCodes } from '../../public/designers/js/data.js';
import { readProducts, PRODUCT_LIMIT, workInHall } from '../../public/designers/js/products.js';
import { findBoothIn } from '../../public/designers/js/state.js';
import { validateWorkIds } from '../../public/designers/js/work-links.js';

export { designerRoot, designerPath } from '../../public/designers/js/routes.js';

export interface DesignerWork {
  id: string;
  title?: string;
  number?: number;
  halls?: string[];
  cover: string;
  name: string;
  caption: string;
  video?: string;
  url?: string;
  width?: number;
  height?: number;
}

interface Booth {
  id: string;
  store: string;
  hallBooths: Array<{ id: string; aisle: string; hall: string }>;
  works: DesignerWork[];
  total: number;
  randomSelection?: boolean;
}

interface ProductCatalogue {
  products: Array<{ id: string; disabled?: boolean }>;
}

const baseUrl = new URL('/data/oshen-designers.json', import.meta.env.SITE).href;
for (const designer of data.designers) {
  validateWorkIds(designer.id, designer.productImages ?? [], 'retiredWorkIds' in designer ? designer.retiredWorkIds : undefined);
}

export const catalogue = createCatalogue(data, { baseUrl, ogImages });
const productFiles = import.meta.glob<ProductCatalogue>('../../public/data/designers/*.json', {
  eager: true,
  import: 'default',
});

export function boothById(id: string) {
  return findBoothIn(catalogue.aisles.get(id.split('-')[0]), id) as Booth | null;
}

export const designers = data.designers.filter(designer => designer.disabled !== true).map(designer => {
  const boothId = catalogue.designerBooths.get(designer.id);
  const aisle = catalogue.aisles.get(boothId?.split('-')[0]);
  const booth = boothId && boothById(boothId);
  if (!booth) throw new Error(`Missing booth for ${designer.id}`);

  const store = aisle.stores[designer.id];
  let works: DesignerWork[] = catalogue.worksByDesigner.get(designer.id);
  if (store.productsUrl) {
    const productsUrl = new URL(store.productsUrl, baseUrl);
    const file = productFiles[`../../public${productsUrl.pathname}`];
    if (!file) throw new Error(`Missing product catalogue for ${designer.id}`);
    validateWorkIds(designer.id, file.products);
    const products = readProducts(file, designer.id, productsUrl.href);
    if (products.length !== file.products.filter(product => product.disabled !== true).length) {
      throw new Error(`Invalid or duplicate work image for ${designer.id}`);
    }
    works = products;
    // Stable static sample. The interactive booth samples again when it opens.
    for (const location of booth.hallBooths) {
      const hallBooth = boothById(location.id)!;
      const hallProducts = products.filter(product => workInHall(product, location.aisle[0]));
      hallBooth.works = [
        ...hallProducts.filter((product: { pinned?: boolean }) => product.pinned),
        ...hallProducts.filter((product: { pinned?: boolean }) => !product.pinned),
      ].slice(0, PRODUCT_LIMIT);
      hallBooth.total = hallProducts.length;
      hallBooth.randomSelection = true;
    }
  }

  return {
    id: designer.id,
    name: designer.name,
    hallCode: aisle.hall,
    hallCodes: designerHallCodes(designer),
    shareHallCodes: [...new Set([
      ...booth.hallBooths.map(({ aisle }) => aisle[0]),
      ...('legacyShareHalls' in designer ? designer.legacyShareHalls : []),
    ])],
    hallName: aisle.hallName,
    booth,
    store,
    og: store.og,
    works,
  };
});

export const designerWorks = designers.flatMap(designer => designer.works
  .filter(work => designer.hallCodes.some(hall => workInHall(work, hall)))
  .map(work => ({ designer, work })));
