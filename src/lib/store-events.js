/** @typedef {{ id: string, name: string, startsAt: string, endsAt: string, groups: { name: string, storeIds: string[] }[] }} StoreEvent */
const files = import.meta.glob('../../public/data/store-events/*.json', { eager: true, import: 'default' });

/** @type {StoreEvent[]} */
export const storeEvents = Object.values(files);

/** @param {string} id */
export function storeEventPath(id) {
  return `/stores/events/${encodeURIComponent(id)}/`;
}
