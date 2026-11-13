const routes = {
  stores: async () => (await import('./stores.js')).mountStores,
  designers: async () => (await import('./catalogues.js')).mountDesigners,
  stage: async () => (await import('./catalogues.js')).mountStage,
};
const views = [...document.querySelectorAll('.view')];
const navigation = [...document.querySelectorAll('.site-nav a')];
const mounted = new Set();
const designerList = document.getElementById('designers-content');
const boothDialog = document.getElementById('designer-booth-dialog');
const designerDetail = document.getElementById('designers-detail');
const designerModes = document.getElementById('designers-views');
const designerWalk = document.getElementById('designers-walk');
const walkHash = 'designers';
const listHash = 'designers/list';
let walkSession;
let designerBackHash = `#${walkHash}`;
let selectedBooth;

async function loadDirectory(route) {
  if (mounted.has(route)) return;
  mounted.add(route);
  const root = document.getElementById(`${route}-content`);
  try {
    const mount = await routes[route]();
    await mount(root);
  } catch {
    mounted.delete(route);
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = '目前無法載入目錄。';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重新載入';
    retry.addEventListener('click', () => loadDirectory(route), { once: true });
    root.replaceChildren(message, retry);
  }
}

function returnToMarket() {
  location.replace(designerBackHash);
}

function boothStatus(text) {
  const row = document.createElement('div');
  row.className = 'designer-booth-loading';
  const message = document.createElement('p');
  message.setAttribute('role', 'status');
  message.textContent = text;
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', '關閉攤位');
  close.textContent = '×';
  close.addEventListener('click', returnToMarket);
  row.append(message, close);
  designerDetail.replaceChildren(row);
}

async function loadDesigner(hash, designerId, workId) {
  boothDialog.removeAttribute('aria-labelledby');
  boothStatus('正在載入攤位…');
  if (!boothDialog.open) boothDialog.showModal();
  boothDialog.scrollTop = 0;
  try {
    const { showDesigner } = await import('./catalogues.js');
    if (location.hash.slice(1) !== hash) return;
    const result = await showDesigner(designerDetail, designerId, workId, {
      backHash: designerBackHash,
      boothNumber: selectedBooth?.designerId === designerId ? selectedBooth.number : undefined,
      onClose: returnToMarket,
    });
    if (location.hash.slice(1) !== hash) return;
    const title = designerDetail.querySelector('[data-designer-title]');
    if (title) {
      boothDialog.setAttribute('aria-labelledby', title.id);
      document.title = `${title.textContent}｜發光的地方`;
      if (!result?.workFound) title.focus({ preventScroll: true });
    }
  } catch {
    if (location.hash.slice(1) !== hash) return;
    boothStatus('目前無法載入攤位。');
  }
}

async function openWalk(designerId) {
  if (walkSession) return;
  const session = {};
  walkSession = session;
  try {
    const { mountMarketWalk } = await import('./market-walk.js');
    if (walkSession !== session) return;
    session.instance = mountMarketWalk(designerWalk, {
      designerId,
      onOpen(id, number) {
        if (boothDialog.open) return;
        selectedBooth = { designerId: id, number };
        location.hash = `designers/${encodeURIComponent(id)}`;
      },
    });
  } catch {
    if (walkSession !== session) return;
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = '目前無法開啟市集走道。';
    const back = document.createElement('a');
    back.href = `#${listHash}`;
    back.textContent = '回攤位列表';
    designerWalk.replaceChildren(message, back);
  }
}

function showRoute({ moveFocus = false } = {}) {
  const wasOpen = boothDialog.open;
  const hash = location.hash.slice(1);
  const walking = hash === walkHash || hash === 'designers/walk';
  const listing = hash === listHash;
  const match = walking || listing ? null : hash.match(/^designers\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
  const route = match || walking || listing ? 'designers' : Object.hasOwn(routes, hash) ? hash : 'home';
  if (walking || listing) designerBackHash = `#${walking ? walkHash : listHash}`;
  const showingWalk = walking || (match && designerBackHash === `#${walkHash}`);
  const activeMode = showingWalk ? walkHash : listHash;
  const view = document.getElementById(route);
  for (const item of views) {
    if (item !== view) {
      for (const dialog of [...item.querySelectorAll('dialog[open]')].reverse()) dialog.close();
    }
    item.hidden = item !== view;
  }
  for (const link of navigation) {
    if (link.hash === `#${route}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  if (!match) {
    for (const dialog of designerDetail.querySelectorAll('dialog[open]')) dialog.close();
    if (boothDialog.open) boothDialog.close();
  }
  designerList.hidden = Boolean(showingWalk);
  designerWalk.hidden = !showingWalk;
  for (const link of designerModes.querySelectorAll('a')) {
    if (link.hash === `#${activeMode}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (!showingWalk && walkSession) {
    walkSession.instance?.destroy();
    walkSession = undefined;
  }

  const heading = document.getElementById(`${route}-title`);
  document.title = route === 'home' ? heading.textContent : `${heading.textContent}｜發光的地方`;

  if (hash === 'explore') {
    const explore = document.getElementById('explore');
    if (moveFocus) explore.querySelector('a').focus({ preventScroll: true });
    explore.scrollIntoView();
  } else if (!match && !(wasOpen && (walking || listing)) && (moveFocus || route !== 'home')) {
    if (moveFocus) heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  if (showingWalk) openWalk(match?.[1]);
  else if (route !== 'home') loadDirectory(route);
  if (match) loadDesigner(hash, match[1], match[2]);
}

boothDialog.addEventListener('cancel', event => {
  event.preventDefault();
  returnToMarket();
});
boothDialog.addEventListener('click', event => {
  if (event.target !== boothDialog) return;
  const { left, top, right, bottom } = boothDialog.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) returnToMarket();
});
window.addEventListener('hashchange', () => showRoute({ moveFocus: true }));
showRoute();
