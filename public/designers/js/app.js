// Exhibition navigation, walk view, dialogs and alternate views.
import { state, on, emit, visitedCount, toast } from './state.js';
import { loadIndex, aisleOfBooth, loadBoothForDesigner, isOshenHall } from './data.js?v=20261126-vote-hall';
import { goToAisle } from './nav.js?v=20261126-vote-hall';
import { createWalkView } from './walk.js?v=20261125-hall-routes';
import { wireFloatingNav } from './floating-nav.js';
import { openBooth } from './ui/booth.js?v=20261126-vote-hall';
import { mountMap } from './ui/map.js?v=20261126-vote-hall';
import { mountList } from './ui/list.js?v=20261126-vote-hall';
import { loadSchedule, isClosed, closeTagText, msLeft, lastOpenLabel } from './schedule.js?v=20261030-site-data';
import { loadCats, loadChatter } from './cats.js?v=20261030-site-data';
import { showClosed } from './ui/closed.js';

import { designerHallRoot, designerViewPath, designerWalkPath, hallPageForPath, updateDesignerMetadata, resolveDesignerRoute } from './routes.js?v=20261126-vote-hall';
import { legacyDesignerDestination } from './legacy-entry.js?v=20261126-vote-hall';

const $ = id => document.getElementById(id);
const BOOTH_ID = /^[A-Z]\d{2}-\d{2}$/;
const AISLE_ID = /^[A-Z]\d{2}$/;

let walk = null;
let list = null;
let map = null;

function finishBoot() {
  if (!$('stage-walk').hidden) walk?.resize();
}

// three pages share the header tabs: 逛場子 (walk), 設計師列表 (list), 設計師地圖 (map)
function setMode(mode, opts = {}) {
  $('stage-walk').hidden = mode !== 'walk';
  $('stage-list').hidden = mode !== 'list';
  $('stage-map').hidden = mode !== 'map';
  for (const b of document.querySelectorAll('.modes button')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  if (mode === 'list') {
    list ||= mountList($('stage-list'));
    const hallPath = designerHallRoot(state.hallCode);
    list.show({
      hall: isOshenHall(state.hallCode) ? undefined : state.hallCode,
      page: hallPageForPath(hallPath),
    });
  } else list?.hide();
  if (mode === 'map') {
    const firstVisit = !map; // The first visit shows the hall overview.
    map ||= mountMap($('stage-map'));
    map.show({ hall: state.hallCode, overview: firstVisit, ...opts });
  }
  if (mode === 'walk') {
    walk?.resize();
  }
  if (opts.keepUrl || !state.aisleCode) return;
  const path = mode === 'walk' ? designerWalkPath(state.aisleCode) : designerViewPath(state.aisleCode, mode);
  // Re-selecting the walk tab keeps the current booth's shareable position.
  if (mode === 'walk' && location.pathname === path && !location.hash && !new URLSearchParams(location.search).has('view')) return;
  history.replaceState(null, '', path);
  updateDesignerMetadata();
}

function updateStatus() {
  const a = state.aisle;
  if (!a) return;
  const zones = [...new Set(a.islands.map(i => i.zoneName))];
  const hasBooths = a.islands.some(i => i.booths.length);
  $('where-hall').textContent = a.hallName;
  $('where-aisle').textContent = `${a.code} 走道`;
  $('status-zone').textContent = zones.join('、') || '目前尚無攤位';
  for (const id of ['hint', 'btn-browse', 'btn-next', 'status-count']) $(id).hidden = !hasBooths;
  $('btn-next').disabled = !hasBooths;
  $('status-count').textContent = `已逛 ${visitedCount()} / ${state.index.totals.booths} 攤`;
}

function wireDialogs() {
  for (const dlg of document.querySelectorAll('dialog.dlg')) {
    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('.dlg-close')) dlg.close();
    });
  }
}

async function boot() {
  const incoming = new URL(location.href);
  if (incoming.hash) {
    const legacy = legacyDesignerDestination(incoming, hallPageForPath(incoming.pathname)?.code || 'O');
    if (legacy && document.documentElement.dataset.designerProfile) {
      incoming.hash = '';
      history.replaceState(null, '', incoming);
    } else if (legacy) history.replaceState(null, '', legacy);
  }
  const entryUrl = location.href;
  wireDialogs();
  wireFloatingNav();
  $('designer-loading-retry')?.addEventListener('click', () => location.reload());

  // opening period: closed means the 休市 screen only, nothing else loads
  await loadSchedule();
  const tag = $('close-tag');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    tag.textContent = '已休市'; tag.hidden = false;
    showClosed();
    finishBoot();
  };
  if (isClosed()) return close();
  const tick = () => {
    if (isClosed()) return close();
    const t = closeTagText();
    tag.textContent = t; tag.hidden = !t;
  };
  tick();
  setInterval(tick, 1000); // the countdown ticks every second
  tag.title = lastOpenLabel() ? `開到 ${lastOpenLabel()}` : '';

  state.index = await loadIndex();

  // the walk view keeps walking to a tapped booth; don't let it open things over a dialog or behind the list
  const busy = () => !!document.querySelector('dialog[open]') || $('stage-walk').hidden;
  walk = createWalkView($('walk-canvas'), {
    nameplates: $('designer-nameplates'),
    onFirstDraw: () => $('stage-walk').removeAttribute('data-opening'),
    onNear: id => {
      state.nearBooth = id;
      const btn = $('btn-browse');
      btn.disabled = !id;
      btn.textContent = id ? `逛 ${id} 這攤` : '靠近即可認識設計師';
      emit('near', { boothId: id });
    },
    onOpen: id => { if (!busy()) openBooth(id); },
    onEnd: dir => {
      if (busy()) return;
      const target = dir === 'next' ? state.neighbors?.next : state.neighbors?.prev;
      if (target) goToAisle(target, { from: dir === 'next' ? 'left' : 'right' });
    },
    // what the guide cats may mention: visited booths and the closing time
    catContext: () => {
      const ms = msLeft();
      const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
      return {
        visited: visitedCount(), closeLabel: lastOpenLabel(),
        closingSoon: ms < 24 * 3600e3, leftText: !Number.isFinite(ms) ? '' : h > 0 ? `${h} 小時 ${m} 分` : `${m} 分鐘`,
      };
    },
  });
  loadCats().then(cfg => { if (cfg) walk.setCats(cfg); });
  loadChatter().then(cfg => { if (cfg) walk.setChatter(cfg); });

  on('aisle', d => {
    if (!d.background && $('stage-walk').hidden) setMode('walk', { keepUrl: true });
    state.neighbors = { prev: d.prev, next: d.next };
    const prevHall = state.index.halls.find(hall => hall.code === d.prev?.[0] && hall.code !== d.data.hall);
    const nextHall = state.index.halls.find(hall => hall.code === d.next?.[0] && hall.code !== d.data.hall);
    walk.setAisle(d.data, {
      ...d,
      prevLabel: prevHall ? `← 往${prevHall.name}` : null,
      nextLabel: nextHall ? `往${nextHall.name} →` : null,
    });
    $('walk-canvas').setAttribute('aria-label', `${d.data.hallName} ${d.code} 走道：按住拖著小人走，點設計師即可查看介紹`);
    updateStatus();
  });
  on('visited', () => { walk.refresh(); updateStatus(); });

  $('btn-browse').addEventListener('click', () => state.nearBooth && openBooth(state.nearBooth));
  $('btn-next').addEventListener('click', () => walk.nextBooth());
  $('btn-find-designer').addEventListener('click', () => {
    setMode('list');
    $('stage-list').focus({ preventScroll: true });
  });
  $('btn-where').addEventListener('click', () => setMode('map', { overview: true }));
  for (const b of document.querySelectorAll('.modes button')) b.addEventListener('click', () => setMode(b.dataset.mode));
  document.querySelector('.plaque').addEventListener('click', e => { e.preventDefault(); setMode('walk'); });
  window.addEventListener('resize', () => walk.resize());
  const hint = $('hint');
  const hideHint = () => { hint.classList.add('is-gone'); };
  $('walk-canvas').addEventListener('pointerdown', hideHint, { once: true });
  window.addEventListener('keydown', hideHint, { once: true });

  async function route({ boot = false } = {}) {
    const url = new URL(location.href);
    const initialEntry = boot && url.href === entryUrl;
    const { mode, target, then, hall } = resolveDesignerRoute(url, { boot: initialEntry });
    const first = `${hallPageForPath(url.pathname)?.code || 'O'}01`;
    if (mode !== 'designer' && $('dlg-booth').open) $('dlg-booth').close();
    if (mode === 'list' || mode === 'map') {
      const aisle = target || state.aisleCode || first;
      if (aisle !== state.aisleCode) await goToAisle(aisle, { background: true });
      setMode(mode);
      return;
    }
    let ok = false;
    if (mode === 'designer') {
      const initialProfile = initialEntry && document.documentElement.dataset.designerProfile === target;
      const boothId = await loadBoothForDesigner(target, hall);
      if (boothId) {
        ok = await goToAisle(aisleOfBooth(boothId), { boothId, background: true });
        if (ok) {
          if (!initialProfile) setMode('walk', { keepUrl: true });
          const opened = await openBooth(boothId, { keepHall: Boolean(hall), initialUrl: initialProfile ? url.href : null });
          if (opened && initialProfile) setMode('walk', { keepUrl: true });
          return;
        }
      } else {
        $('dlg-booth').close();
        toast('找不到這位設計師，攤位可能已下架');
      }
      if (initialProfile) return;
    } else if (target && BOOTH_ID.test(target)) {
      ok = await goToAisle(aisleOfBooth(target), { boothId: target });
      if (ok && then === 'open') { await openBooth(target); return; }
    }
    else if (target && AISLE_ID.test(target)) ok = await goToAisle(target);
    if (!ok && (boot || !state.aisle)) await goToAisle(first);
    setMode('walk', { keepUrl: ok });
  }
  // Switching the active profile's hall is a normal link, including back, forward
  // and opening in a new tab. An ordinary click reuses the open dialog.
  $('dlg-booth').addEventListener('click', event => {
    const link = event.target.closest('a.bo-also-item');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (link.href === location.href) return;
    history.pushState(null, '', link.href);
    route();
  });
  let popUrl;
  window.addEventListener('popstate', () => { popUrl = location.href; route(); });
  window.addEventListener('hashchange', event => {
    if (event.newURL === location.href && event.newURL !== popUrl) route();
    popUrl = null;
  });
  await route({ boot: true });
  updateStatus();
  finishBoot();
}

boot().catch(err => {
  console.error(err);
  const errorNotice = $('designer-walk-error');
  if (errorNotice) errorNotice.hidden = false;
  toast('載入失敗，請重新整理再試一次');
});
