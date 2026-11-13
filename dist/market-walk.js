import { createWalkView } from './vendor/designer-walk/walk.js';

const halls = [
  { code: 'O', name: '設計師館', category: '設計師' },
  { code: 'A', name: '愛好者館', category: '愛好者' },
];
const boothsPerSide = 8;
const boothsPerAisle = boothsPerSide * 2;
const twoDigits = value => String(value).padStart(2, '0');
const designerHash = id => `#designers/${encodeURIComponent(id)}`;

let lastAisle;
let lastBooth;
const visited = new Set();

function buildAisles(designers) {
  return halls.flatMap(hall => {
    const members = designers.filter(designer => (designer.category === '愛好者') === (hall.code === 'A'));
    const aisles = [];
    for (let start = 0; start < members.length; start += boothsPerAisle) {
      const code = hall.code + twoDigits(aisles.length + 1);
      const group = members.slice(start, start + boothsPerAisle);
      const stores = Object.fromEntries(group.map(designer => [designer.id, {
        name: designer.name,
        avatar: designer.logo?.url || '',
      }]));
      const booths = group.map((designer, index) => ({
        id: `${code}-${twoDigits(index + 1)}`,
        store: designer.id,
        works: (designer.works || [])
          .filter(work => work.images?.[0]?.url)
          .slice(0, 2)
          .map(work => ({ cover: work.images[0].url, name: work.title })),
      }));
      const islands = ['N', 'S'].map((side, index) => ({
        side,
        zoneName: hall.category,
        booths: booths.slice(index * boothsPerSide, (index + 1) * boothsPerSide),
      })).filter(island => island.booths.length);
      aisles.push({ code, hall: hall.code, hallName: hall.name, stores, booths, islands });
    }
    return aisles;
  });
}

export function mountMarketWalk(root) {
  const controller = new AbortController();
  let walk;
  root.innerHTML = `
    <div class="market-walk" aria-label="互動逛攤位">
      <p data-walk-status role="status">正在布置攤位…</p>
      <button type="button" data-walk-retry hidden>重新載入</button>
      <div data-walk-content hidden>
        <div class="market-walk-header">
          <p data-walk-aisle aria-live="polite"></p>
          <div class="market-walk-actions" aria-label="換走道">
            <button type="button" data-walk-prev>← 上一條走道</button>
            <button type="button" data-walk-next>下一條走道 →</button>
          </div>
        </div>
        <p class="market-walk-hint">點攤位看作品，或在場內按住拖動小人。電腦可用方向鍵移動，按 Enter 打開附近攤位。</p>
        <canvas tabindex="0" aria-label="設計師攤位走道">可用下方的選單開啟設計師攤位。</canvas>
        <div class="market-walk-footer">
          <div class="market-walk-actions">
            <button type="button" data-walk-open disabled>靠近即可看攤位</button>
            <button type="button" data-walk-next-booth>下一攤</button>
          </div>
          <label class="market-walk-choose">
            <span>找設計師</span>
            <select data-walk-select aria-label="選擇設計師"></select>
          </label>
          <a data-walk-selected>打開攤位 ↗</a>
        </div>
        <p data-walk-message role="status"></p>
      </div>
    </div>`;
  const select = selector => root.querySelector(selector);
  const status = select('[data-walk-status]');
  const retry = select('[data-walk-retry]');
  const content = select('[data-walk-content]');
  const canvas = select('canvas');
  const aisleLabel = select('[data-walk-aisle]');
  const prev = select('[data-walk-prev]');
  const next = select('[data-walk-next]');
  const open = select('[data-walk-open]');
  const nextBooth = select('[data-walk-next-booth]');
  const designerPicker = select('[data-walk-select]');
  const selected = select('[data-walk-selected]');
  const message = select('[data-walk-message]');
  const { signal } = controller;

  async function load() {
    status.textContent = '正在布置攤位…';
    status.hidden = false;
    retry.hidden = true;
    try {
      const response = await fetch(new URL('./data/designers.json', import.meta.url), { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (signal.aborted) return;
      const aisles = buildAisles(data.designers);
      if (!aisles.length) {
        status.textContent = '目前沒有可逛的攤位。';
        return;
      }
      if (!canvas.getContext('2d')) {
        status.textContent = '這個瀏覽器無法顯示攤位走道。仍可從選單看設計師作品。';
        canvas.hidden = prev.hidden = next.hidden = open.hidden = nextBooth.hidden = true;
      }
      start(aisles);
      content.hidden = false;
      if (!canvas.hidden) {
        status.hidden = true;
        walk.resize();
      }
    } catch {
      if (signal.aborted) return;
      walk?.destroy();
      walk = undefined;
      content.hidden = true;
      status.textContent = '攤位資料暫時無法載入。';
      retry.hidden = false;
    }
  }

  function start(aisles) {
    let index = Math.max(0, aisles.findIndex(aisle => aisle.code === lastAisle));
    let near;
    const byId = new Map(aisles.flatMap(aisle => aisle.booths.map(booth => [booth.id, booth])));
    const byDesigner = new Map(aisles.flatMap((aisle, aisleIndex) =>
      aisle.booths.map(booth => [booth.store, { booth, aisleIndex }])));
    designerPicker.replaceChildren();
    for (const hall of halls) {
      const group = document.createElement('optgroup');
      group.label = hall.name;
      for (const aisle of aisles.filter(item => item.hall === hall.code)) {
        for (const booth of aisle.booths) {
          group.append(new Option(`${aisle.stores[booth.store].name}（${booth.id}）`, booth.store));
        }
      }
      if (group.children.length) designerPicker.append(group);
    }

    function showAisle(aisleIndex, { boothId, from } = {}) {
      if (!aisles[aisleIndex]) return;
      index = aisleIndex;
      message.textContent = '';
      const aisle = aisles[index];
      lastAisle = aisle.code;
      lastBooth = boothId;
      aisleLabel.textContent = `${aisle.hallName} · ${aisle.code} 走道`;
      prev.disabled = index === 0;
      next.disabled = index === aisles.length - 1;
      const previous = aisles[index - 1];
      const following = aisles[index + 1];
      walk?.setAisle(aisle, {
        boothId,
        from,
        prev: previous?.code,
        next: following?.code,
        prevLabel: previous && previous.hall !== aisle.hall ? `← 往${previous.hallName}` : null,
        nextLabel: following && following.hall !== aisle.hall ? `往${following.hallName} →` : null,
      });
    }

    function rememberBooth(booth) {
      visited.add(booth.store);
      const { aisleIndex } = byDesigner.get(booth.store);
      lastAisle = aisles[aisleIndex].code;
      lastBooth = booth.id;
    }

    function openBooth(id) {
      const booth = byId.get(id);
      if (!booth || root.offsetParent === null) return;
      rememberBooth(booth);
      location.hash = designerHash(booth.store);
    }

    function moveAisle(step) {
      const destination = aisles[index + step];
      if (!destination) return;
      showAisle(index + step, { from: step < 0 ? 'right' : 'left' });
      designerPicker.value = destination.booths[0].store;
      updateSelected();
    }
    if (!canvas.hidden) {
      walk = createWalkView(canvas, {
        onNear(id) {
          near = id;
          open.disabled = !near;
          const current = byId.get(near);
          open.textContent = current ? `看${aisles[index].stores[current.store].name}的攤位` : '靠近即可看攤位';
        },
        onOpen: openBooth,
        onEnd: direction => moveAisle(direction === 'prev' ? -1 : 1),
        visited: id => visited.has(byId.get(id)?.store),
        notify: text => { message.textContent = text; },
      });
      fetch(new URL('./vendor/designer-walk/chatter.json', import.meta.url), { signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => { if (data && !signal.aborted) walk?.setChatter(data); })
        .catch(() => {});
    }

    designerPicker.value = byId.get(lastBooth)?.store || aisles[index].booths[0].store;
    const updateSelected = () => { selected.href = designerHash(designerPicker.value); };
    updateSelected();
    designerPicker.addEventListener('change', () => {
      updateSelected();
      const { booth, aisleIndex } = byDesigner.get(designerPicker.value);
      if (aisleIndex !== index) showAisle(aisleIndex, { boothId: booth.id });
      else walk?.focusBooth(booth.id);
    }, { signal });
    selected.addEventListener('click', () => rememberBooth(byDesigner.get(designerPicker.value).booth), { signal });
    prev.addEventListener('click', () => moveAisle(-1), { signal });
    next.addEventListener('click', () => moveAisle(1), { signal });
    nextBooth.addEventListener('click', () => walk?.nextBooth(), { signal });
    open.addEventListener('click', () => openBooth(near), { signal });
    showAisle(index, { boothId: lastBooth });
  }

  retry.addEventListener('click', load, { signal });
  load();
  return {
    destroy() {
      controller.abort();
      walk?.destroy();
      root.replaceChildren();
    },
  };
}
