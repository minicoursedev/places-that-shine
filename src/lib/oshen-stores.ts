import storeCatalogue from '../../public/data/stores.json';
import { readStores } from './oshen-store-data';

export { storePath, storeCity } from './oshen-store-links.mjs';

export const stores = readStores(storeCatalogue, import.meta.env.SITE);
