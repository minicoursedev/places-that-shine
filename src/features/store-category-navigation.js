import { storeCategoryPath } from '../lib/oshen-store-links.mjs';

const metadataSelector = 'link[rel="canonical"], meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"]';

export function storeCategoryFromPath(path) {
  if (/^\/stores\/?$/.test(path)) return '';
  const match = /^\/stores\/categories\/([^/]+)\/?$/.exec(path);
  if (!match) return null;
  try {
    const category = decodeURIComponent(match[1]);
    return category.trim() && !/[\x00-\x1f\x7f/\\]/.test(category) ? category : null;
  } catch {
    return null;
  }
}

export function createStoreCategoryNavigation(root) {
  // Event pages have their own canonical URL and sharing metadata.
  if (root.dataset.eventId) {
    return category => {
      location.assign(category ? storeCategoryPath(category) : '/stores/');
      return false;
    };
  }
  const directory = root.closest('.stores-directory');
  const categoryNavigation = directory.querySelector('.store-category-directory');
  const links = [...categoryNavigation.querySelectorAll('a[href]')];
  const categories = new Set(links.map(link => storeCategoryFromPath(new URL(link.href).pathname)));
  const cache = new Map();
  let latestRequest = 0;
  let controller;
  let staticDetailsOpen = directory.querySelector('.store-static-directory')?.open || false;

  function readPage(page, category) {
    const source = page.querySelector('.stores-directory');
    const heading = source?.querySelector('#stores-title');
    const canonical = page.head.querySelector('link[rel="canonical"]');
    const staticDirectory = source?.querySelector('.store-static-directory');
    if (!heading || !page.title || !canonical ||
        !page.head.querySelector('meta[name="description"]') ||
        (source.querySelector('#stores-content')?.dataset.category || '') !== category ||
        storeCategoryFromPath(new URL(canonical.href, location.href).pathname) !== category ||
        (category && !staticDirectory)) {
      throw new Error('無法讀取店家分類頁。');
    }
    return {
      title: page.title,
      metadata: [...page.head.querySelectorAll(metadataSelector)].map(node => node.cloneNode(true)),
      heading: heading.textContent,
      staticDirectory: staticDirectory?.cloneNode(true),
    };
  }

  function applyPage(page, category) {
    document.title = page.title;
    document.head.querySelectorAll(metadataSelector).forEach(node => node.remove());
    document.head.append(...page.metadata.map(node => node.cloneNode(true)));
    directory.querySelector('#stores-title').textContent = page.heading;
    const currentStatic = directory.querySelector('.store-static-directory');
    if (currentStatic) staticDetailsOpen = currentStatic.open;
    if (page.staticDirectory) {
      const replacement = page.staticDirectory.cloneNode(true);
      replacement.open = staticDetailsOpen;
      if (currentStatic) currentStatic.replaceWith(replacement);
      else categoryNavigation.before(replacement);
    } else currentStatic?.remove();
    for (const link of links) {
      if (storeCategoryFromPath(new URL(link.href).pathname) === category) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    root.dataset.category = category;
  }

  const initialCategory = root.dataset.category || '';
  cache.set(initialCategory ? storeCategoryPath(initialCategory) : '/stores/', readPage(document, initialCategory));

  return async function navigate(category, { history = true } = {}) {
    const request = ++latestRequest;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    try {
      if (typeof category !== 'string' || (category && !categories.has(category))) {
        throw new Error('找不到這個店家分類。');
      }
      const path = category ? storeCategoryPath(category) : '/stores/';
      let page = cache.get(path);
      if (!page) {
        const response = await fetch(new URL(path, location.origin), { signal, cache: 'no-cache', headers: { Accept: 'text/html' } });
        if (request !== latestRequest) return false;
        if (!response.ok) throw new Error('目前無法載入店家分類，請稍後重試。');
        const html = await response.text();
        if (request !== latestRequest) return false;
        page = readPage(new DOMParser().parseFromString(html, 'text/html'), category);
        cache.set(path, page);
      }
      if (request !== latestRequest) return false;
      applyPage(page, category);
      if (history) window.history.pushState(window.history.state, '', path);
      return true;
    } catch (error) {
      if (request !== latestRequest) return false;
      throw error;
    } finally {
      if (request === latestRequest) controller = undefined;
    }
  };
}
