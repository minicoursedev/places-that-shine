import storeCatalogue from '../../public/data/stores.json';
import { readStores } from './oshen-store-data';

export { storePath, storeCity, storeCategoryPath } from './oshen-store-links.mjs';

export const stores = readStores(storeCatalogue, import.meta.env.SITE);

export const categories = [...new Set(stores.map(store => store.category))]
  .sort(new Intl.Collator('zh-Hant-TW').compare);
