const STORE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CITY_PREFIX = /^(?:\d{3}(?:-?\d{2,3})?\s*)?([\p{Script=Han}]{2}[縣市])/u;

export function isVisibleStore(store) {
  return store?.disabled !== true
    && typeof store?.id === 'string' && STORE_ID.test(store.id)
    && ['name', 'address', 'category'].every(key => typeof store?.[key] === 'string' && store[key].trim());
}

export function storePath(id) {
  return `/stores/${id}/`;
}

export function storeMapPath(id) {
  return `/stores/#map/${id}`;
}

export function storeMapId(hash) {
  const id = hash.startsWith('#map/') ? hash.slice('#map/'.length) : '';
  return STORE_ID.test(id) ? id : null;
}

export function storeCity(address) {
  return address.normalize('NFKC').replaceAll('台', '臺').trim().match(CITY_PREFIX)?.[1] || '';
}
