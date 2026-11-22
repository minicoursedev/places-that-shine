const CITY_PREFIX = /^(?:\d{3}(?:-?\d{2,3})?\s*)?([\p{Script=Han}]{2}[縣市])/u;
const MAP_HASH_PREFIX = '#map/';

export const STORE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const storeMapCenterParam = 'center';

export function storePath(id) {
  return `/stores/${id}/`;
}

export function storeMapPath(id) {
  return `/stores/${MAP_HASH_PREFIX}${id}`;
}

export function storeMapId(hash) {
  const id = hash.startsWith(MAP_HASH_PREFIX) ? hash.slice(MAP_HASH_PREFIX.length) : '';
  return STORE_ID.test(id) ? id : null;
}

export function storeCity(address) {
  return address.normalize('NFKC').replaceAll('台', '臺').trim().match(CITY_PREFIX)?.[1] || '';
}
