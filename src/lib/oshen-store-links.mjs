const CITY_PREFIX = /^(?:\d{3}(?:-?\d{2,3})?\s*)?([\p{Script=Han}]{2}[縣市])/u;

export function storePath(id) {
  return `/stores/${id}/`;
}

export function storeCity(address) {
  return address.normalize('NFKC').replaceAll('台', '臺').trim().match(CITY_PREFIX)?.[1] || '';
}
