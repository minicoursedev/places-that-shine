const routes = {
  stores: async () => (await import('./stores.js')).mountStores,
  designers: async () => (await import('./catalogues.js')).mountDesigners,
  stage: async () => (await import('./catalogues.js')).mountStage,
};
const views = [...document.querySelectorAll('.view')];
const navigation = [...document.querySelectorAll('.site-nav a')];
const mounted = new Set();

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

function showRoute({ moveFocus = false } = {}) {
  const hash = location.hash.slice(1);
  const route = Object.hasOwn(routes, hash) ? hash : 'home';
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

  const heading = document.getElementById(`${route}-title`);
  document.title = route === 'home' ? heading.textContent : `${heading.textContent}｜發光的地方`;

  if (hash === 'explore') {
    const explore = document.getElementById('explore');
    if (moveFocus) explore.querySelector('a').focus({ preventScroll: true });
    explore.scrollIntoView();
  } else if (moveFocus || route !== 'home') {
    if (moveFocus) heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  if (route !== 'home') loadDirectory(route);
}

window.addEventListener('hashchange', () => showRoute({ moveFocus: true }));
showRoute();
