import { designerPath, designerSharePath } from './routes.js?v=20261124-profile-title';
import { designerNameplatePositions } from './walk-layout.js';

export function bindNameplates(root, onOpen) {
  let selected = null, aisleData = null, lastCamera = null;
  let links = new Map();

  function select(aisle) {
    let group = null;
    for (const item of root.children) {
      item.hidden = item.dataset.aisle !== aisle.code;
      if (!item.hidden) group = item;
    }
    if (!group) {
      group = document.createElement('div');
      group.className = 'hall-opening-world';
      group.dataset.aisle = aisle.code;
      root.append(group);
    }
    const existing = new Map(Array.from(group.children, a => [a.dataset.booth, a]));
    const portrait = designerNameplatePositions(aisle, false);
    const landscape = designerNameplatePositions(aisle, true);
    links = new Map();
    for (const island of aisle.islands) {
      for (const booth of island.booths) {
        const store = aisle.stores[booth.store];
        const a = existing.get(booth.id) || document.createElement('a');
        const href = store.primaryHall === aisle.hall ? designerPath(store.id) : designerSharePath(store.id, aisle.hall);
        if (a.getAttribute('href') !== href) a.setAttribute('href', href);
        if (a.textContent !== store.name) a.textContent = store.name;
        a.dataset.booth = booth.id;
        a.dataset.side = portrait.get(booth.id).side;
        a.style.setProperty('--portrait-x', portrait.get(booth.id).x);
        a.style.setProperty('--landscape-x', landscape.get(booth.id).x);
        if (!a.parentElement) group.append(a);
        existing.delete(booth.id);
        links.set(booth.id, a);
      }
    }
    for (const stale of existing.values()) stale.remove();
    selected = group;
    aisleData = aisle;
    lastCamera = null;
  }

  // Pointer gestures continue to reach the Canvas over the nameplates. A keyboard
  // activation opens the same booth, while modified link actions retain their URL.
  function activate(event) {
    const link = event.target.closest('[data-booth]');
    if (!link || !selected?.contains(link) || event.defaultPrevented || event.button !== 0 ||
      event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    onOpen(link.dataset.booth);
  }
  root.addEventListener('click', activate);

  return {
    draw(aisle, layout, camX, scale, offY, viewportWidth) {
      if (aisle !== aisleData) select(aisle);
      if (lastCamera?.layout === layout && lastCamera.x === camX && lastCamera.scale === scale &&
        lastCamera.y === offY && lastCamera.width === viewportWidth) return;
      selected.style.setProperty('--live-unit', scale + 'px');
      selected.style.setProperty('--live-left', (-camX * scale) + 'px');
      selected.style.setProperty('--live-top', offY + 'px');
      const right = camX + viewportWidth / scale;
      for (const booth of layout.booths) {
        const link = links.get(booth.b.id);
        const index = booth.cx >= camX && booth.cx <= right ? 0 : -1;
        if (link.tabIndex !== index) link.tabIndex = index;
      }
      lastCamera = { layout, x: camX, scale, y: offY, width: viewportWidth };
    },
    destroy() { root.removeEventListener('click', activate); },
  };
}
