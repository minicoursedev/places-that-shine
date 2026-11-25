/**
 * @typedef {Object} StoreEvent
 * @property {string} id
 * @property {string} name
 * @property {string} startsAt
 * @property {string} endsAt
 * @property {string} [organizerUrl]
 * @property {string} [introduction]
 * @property {string} [shareImageAlt]
 * @property {{ name: string, storeIds: string[] }[]} groups
 */
const files = import.meta.glob('../../public/data/store-events/*.json', { eager: true, import: 'default' });

/** @type {StoreEvent[]} */
export const storeEvents = Object.values(files);

/** @param {string} id */
export function storeEventPath(id) {
  return `/stores/events/${encodeURIComponent(id)}/`;
}
