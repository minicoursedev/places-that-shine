const routes = {
  stores: async () => (await import('./stores.js')).mountStores,
  designers: async () => (await import('./catalogues.js')).mountDesigners,
  stage: async () => (await import('./catalogues.js')).mountStage,
};
const views = [...document.querySelectorAll('.view')];
const navigation = [...document.querySelectorAll('.site-nav a')];
const mounted = new Set();
const designerList = document.getElementById('designers-content');
const designerDetail = document.getElementById('designers-detail');
const designersHeader = document.getElementById('designers-header');

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

async function loadDesigner(hash, designerId, workId) {
  try {
    const { showDesigner } = await import('./catalogues.js');
    if (location.hash.slice(1) !== hash) return;
    const result = await showDesigner(designerDetail, designerId, workId);
    if (location.hash.slice(1) !== hash) return;
    const title = designerDetail.querySelector('[data-designer-title]');
    if (title) {
      document.title = `${title.textContent}｜發光的地方`;
      if (!result?.workFound) title.focus({ preventScroll: true });
    }
  } catch {
    if (location.hash.slice(1) !== hash) return;
    const message = document.createElement('p');
    message.setAttribute('role', 'status');
    message.textContent = '目前無法載入設計師作品。';
    const back = document.createElement('a');
    back.href = '#designers';
    back.textContent = '回設計師目錄';
    designerDetail.replaceChildren(message, back);
  }
}

function showRoute({ moveFocus = false } = {}) {
  const hash = location.hash.slice(1);
  const match = hash.match(/^designers\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/);
  const route = match ? 'designers' : Object.hasOwn(routes, hash) ? hash : 'home';
  const view = document.getElementById(route);
  for (const item of views) {
    if (item !== view) {
      for (const dialog of item.querySelectorAll('dialog[open]')) dialog.close();
    }
    item.hidden = item !== view;
  }
  for (const link of navigation) {
    if (link.hash === `#${route}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  if (!match) {
    for (const dialog of designerDetail.querySelectorAll('dialog[open]')) dialog.close();
  }
  designerList.hidden = Boolean(match);
  designerDetail.hidden = !match;
  designersHeader.hidden = Boolean(match);
  view.setAttribute('aria-labelledby', match ? 'designers-detail-title' : `${route}-title`);

  const heading = document.getElementById(`${route}-title`);
  document.title = route === 'home' ? heading.textContent : `${heading.textContent}｜發光的地方`;

  if (hash === 'explore') {
    const explore = document.getElementById('explore');
    if (moveFocus) explore.querySelector('a').focus({ preventScroll: true });
    explore.scrollIntoView();
  } else if (moveFocus || route !== 'home') {
    if (moveFocus && !match) heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  if (match) loadDesigner(hash, match[1], match[2]);
  else if (route !== 'home') loadDirectory(route);
}

window.addEventListener('hashchange', () => showRoute({ moveFocus: true }));
showRoute();
