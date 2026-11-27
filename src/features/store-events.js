import { storeEventPath, storeEvents } from '../lib/store-events.js';

const events = storeEvents.map(event => ({
  ...event,
  start: Date.parse(event.startsAt),
  end: Date.parse(event.endsAt),
  storeIds: new Set(event.groups.flatMap(group => group.storeIds)),
}));

export function createStoreEventFilter(directory, pageEventId, onChange) {
  const nav = directory.querySelector('.store-events');
  const eventSelect = nav?.querySelector('select');
  const groupSelect = directory.querySelector('.store-event-group select');
  let available = [];
  let selected;
  let timer;
  let dismissed = false;

  function sync() {
    clearTimeout(timer);
    const now = Date.now();
    const next = events.filter(event => event.start <= now && now < event.end);
    const url = new URL(location.href);
    const legacyId = url.searchParams.get('event');
    const nextSelected = next.find(event => event.id === (pageEventId || legacyId));
    url.searchParams.delete('event');
    if ((nextSelected?.id || '') !== pageEventId) {
      url.pathname = nextSelected ? storeEventPath(nextSelected.id) : '/stores/';
      location.replace(url);
      return;
    }
    if (legacyId !== null) history.replaceState(history.state, '', url);
    selected = nextSelected;
    if (nav && (next.length !== available.length || next.some((event, i) => event !== available[i]))) {
      available = next;
      nav.hidden = dismissed || available.length === 0;
      const placeholder = new Option('選擇活動', '', true, true);
      placeholder.disabled = true;
      eventSelect.replaceChildren(placeholder, ...available.map(event => new Option(event.name, event.id)));
    }
    const boundary = Math.min(...events.flatMap(event => [event.start, event.end]).filter(time => time > now));
    if (Number.isFinite(boundary)) timer = setTimeout(sync, Math.min(boundary - now, 2_147_483_647));
  }

  nav?.querySelector('.store-events-close').addEventListener('click', () => {
    dismissed = nav.hidden = true;
    directory.querySelector('h1').focus({ preventScroll: true });
  });
  eventSelect?.addEventListener('change', () => {
    const id = eventSelect.value;
    if (!id) return;
    eventSelect.value = '';
    location.assign(storeEventPath(id));
  });
  groupSelect?.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.addEventListener('pageshow', sync);
  sync();

  return {
    get selected() { return selected; },
    includes(id) {
      if (!selected) return true;
      const group = selected.groups.find(group => group.name === groupSelect?.value);
      return group ? group.storeIds.includes(id) : selected.storeIds.has(id);
    },
  };
}
