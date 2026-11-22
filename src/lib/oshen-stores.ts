import storeCatalogue from '../../public/data/stores.json';
import { isVisibleStore } from './oshen-store-links.mjs';

export { storePath, storeCity } from './oshen-store-links.mjs';

interface StoreImage {
  url?: string;
  alt?: string;
  caption?: string;
}

interface Store {
  id: string;
  name: string;
  address: string;
  category: string;
  disabled?: boolean;
  serviceType?: string;
  shopPhoto?: StoreImage & { status?: string };
  social?: Record<string, string | undefined>;
  openingHours?: { status?: string; text?: string; note?: string };
  visitNote?: string;
  visitUrl?: string;
  latlng?: { lat: number; lng: number };
  productImages?: StoreImage[];
  visitRecords?: {
    author?: string;
    source?: string;
    url?: string;
    excerpt?: string;
    photo?: StoreImage;
  }[];
}

export const stores = (storeCatalogue.stores as Store[]).filter(isVisibleStore);
