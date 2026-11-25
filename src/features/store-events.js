const eventFiles = import.meta.glob('../../public/data/store-events/*.json', { eager: true, import: 'default' });
const events = Object.values(eventFiles).map(event => ({
  ...event,
  start: Date.parse(event.startsAt),
  end: Date.parse(event.endsAt),
  storeIds: new Set(event.groups.flatMap(group => group.storeIds)),
}));

function eventLink(text, path, current) {
  const link = document.createElement('a');
  link.className = 'store-action';
  link.href = path;
  link.textContent = text;
  if (current) link.setAttribute('aria-current', 'page');
  return link;
}

export function createStoreEventFilter(nav, onChange) {
  const links = nav.querySelector('.store-event-links');
  const groupSelect = nav.querySelector('select');
  let available = [];
  let selected;
  let timer;

  function sync() {
    clearTimeout(timer);
    const now = Date.now();
    const next = events.filter(event => event.start <= now && now < event.end);
    const url = new URL(location.href);
    const requested = url.searchParams.get('event');
    const nextSelected = next.find(event => event.id === requested);
    if (requested !== null && !nextSelected) {
      url.searchParams.delete('event');
      history.replaceState(history.state, '', url);
    }
    const selectionChanged = nextSelected !== selected;
    if (selectionChanged || next.length !== available.length || next.some((event, i) => event !== available[i])) {
      selected = nextSelected;
      available = next;
      nav.hidden = available.length === 0;
      links.replaceChildren();
      for (const event of available) {
        links.append(eventLink(event.name, '/stores/?event=' + encodeURIComponent(event.id), event === selected));
      }
      if (selected) links.append(eventLink('回全部店家', '/stores/'));
      if (selectionChanged) {
        groupSelect.closest('label').hidden = !selected;
        groupSelect.replaceChildren(new Option('全部分組', ''));
        for (const group of selected?.groups || []) groupSelect.add(new Option(group.name, group.name));
      }
    }
    const boundary = Math.min(...events.flatMap(event => [event.start, event.end]).filter(time => time > now));
    if (Number.isFinite(boundary)) timer = setTimeout(refresh, Math.min(boundary - now, 2_147_483_647));
    return selectionChanged;
  }

  function refresh() {
    if (sync()) onChange();
  }

  groupSelect.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', refresh);
  sync();

  return {
    sync,
    get selected() { return selected; },
    includes(id) {
      if (!selected) return true;
      const group = selected.groups.find(group => group.name === groupSelect.value);
      return group ? group.storeIds.includes(id) : selected.storeIds.has(id);
    },
  };
}
