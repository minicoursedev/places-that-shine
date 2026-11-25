import data from '../../public/data/oshen-designers.json';
import ogImages from 'designer-og-manifest';
import { createCatalogue, designerHallCodes } from '../../public/designers/js/data.js';
import { readProducts, PRODUCT_LIMIT } from '../../public/designers/js/products.js';
import { validateWorkIds } from '../../public/designers/js/work-links.js';

export { designerRoot, designerPath } from '../../public/designers/js/routes.js';

export interface DesignerWork {
  id: string;
  title?: string;
  number?: number;
  cover: string;
  name: string;
  caption: string;
  video?: string;
  url?: string;
  width?: number;
  height?: number;
}

interface Booth {
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

export const designers = data.designers.filter(designer => designer.disabled !== true).map(designer => {
  const boothId = catalogue.designerBooths.get(designer.id);
  const aisle = catalogue.aisles.get(boothId?.split('-')[0]);
  const booth = aisle?.islands.flatMap((island: { booths: Booth[] }) => island.booths)
    .find((entry: Booth) => entry.store === designer.id);
  if (!booth) throw new Error(`Missing booth for ${designer.id}`);

  const store = aisle.stores[designer.id];
  let works: DesignerWork[] = booth.works;
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
    booth.works = [
      ...products.filter((product: { pinned?: boolean }) => product.pinned),
      ...products.filter((product: { pinned?: boolean }) => !product.pinned),
    ].slice(0, PRODUCT_LIMIT);
    booth.total = products.length;
    booth.randomSelection = true;
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

export const designerWorks = designers.flatMap(designer => designer.works.map(work => ({ designer, work })));
