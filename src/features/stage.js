const PAGE_SIZE = 9;
const VALID_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function textValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeUrl(value) {
  if (!textValue(value)) return null;
  try {
    const url = new URL(value, location.origin);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === 'http:')) return url;
    return null;
  } catch {
    return null;
  }
}

function enabledEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('目錄資料格式不正確');
  return entries.filter(entry => entry && entry.disabled !== true && VALID_ID.test(textValue(entry.id)));
}

function stageMedia(value) {
  const url = safeUrl(value);
  if (!url) return {};

  const [, kind, key] = url.pathname.split('/');
  let id;
  if (url.hostname === 'youtu.be') id = kind;
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
    if (kind === 'watch') id = url.searchParams.get('v');
    if (['shorts', 'embed', 'live'].includes(kind)) id = key;
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(id || '')) {
    return {
      url: `https://www.youtube.com/watch?v=${id}`,
      image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embed: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&autoplay=1`,
    };
  }
  return { url: url.href, file: /\.(mp4|webm)$/i.test(url.pathname) ? url.href : null };
}

function stageEntries(data) {
  const catalogueHalls = Array.isArray(data?.halls) ? data.halls : [];
  const halls = new Map(catalogueHalls.filter(Boolean).map(hall => [hall.id, textValue(hall.name)]));
  return enabledEntries(data?.stages).map(stage => {
    const media = stageMedia(stage.url);
    return {
      name: textValue(stage.title),
      creator: textValue(stage.creator),
      category: halls.get(stage.hall) || '公共舞台',
      description: textValue(stage.description),
      ...media,
      image: safeUrl(stage.poster)?.href || media.image,
    };
  }).filter(entry => entry.name && entry.url);
}

function externalLink(href, className, label) {
  const link = element('a', className, label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function imageElement(url) {
  const image = element('img');
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => image.remove(), { once: true });
  image.src = url;
  return image;
}

function player() {
  const dialog = element('dialog', 'catalogue-player');
  const heading = element('h3', 'catalogue-player-title');
  heading.id = 'catalogue-stage-player-title';
  dialog.setAttribute('aria-labelledby', heading.id);
  const close = element('button', 'catalogue-button catalogue-close', '關閉');
  close.type = 'button';
  close.autofocus = true;
  close.addEventListener('click', () => dialog.close());
  const header = element('div', 'catalogue-player-header');
  header.append(heading, close);
  const body = element('div', 'catalogue-player-body');
  const footer = element('div', 'catalogue-player-footer');
  dialog.append(header, body, footer);
  dialog.addEventListener('close', () => {
    body.replaceChildren();
    footer.replaceChildren();
  });

  function open(entry, event) {
    if (typeof dialog.showModal !== 'function' || !(entry.embed || entry.file)) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    heading.textContent = entry.name;
    let media;
    if (entry.embed) {
      media = element('iframe');
      media.src = entry.embed;
      media.title = entry.name;
      media.referrerPolicy = 'strict-origin-when-cross-origin';
      media.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      media.allowFullscreen = true;
    } else {
      media = element('video');
      media.src = entry.file;
      media.controls = true;
      media.playsInline = true;
    }
    body.replaceChildren(media);
    const label = entry.embed ? '在 YouTube 開啟 ↗' : '開啟影片原檔 ↗';
    footer.replaceChildren(externalLink(entry.url, 'catalogue-source-link', label));
    if (entry.description) {
      footer.append(element('p', 'catalogue-player-description', entry.description));
    }
    dialog.showModal();
  }

  return { dialog, open };
}

function stageCard(entry, videoPlayer) {
  const item = element('li', 'catalogue-card');
  const link = externalLink(entry.url, 'catalogue-card-link');
  const cover = element('div', 'catalogue-cover catalogue-cover-video');
  if (entry.image) cover.append(imageElement(entry.image));
  const play = element('span', 'catalogue-play');
  play.setAttribute('aria-hidden', 'true');
  cover.append(play);
  link.addEventListener('click', event => videoPlayer.open(entry, event));
  const content = element('div', 'catalogue-card-content');
  const title = element('h3', 'catalogue-card-title', entry.name);
  content.append(element('p', 'catalogue-card-category', entry.category), title);
  if (entry.creator && entry.creator !== entry.category) {
    content.append(element('p', 'catalogue-card-detail', entry.creator));
  }
  const action = element('span', 'catalogue-card-action', '觀看影片');
  const arrow = element('span', '', '→');
  arrow.setAttribute('aria-hidden', 'true');
  action.append(arrow);
  content.append(action);
  link.append(cover, content);
  item.append(link);
  return item;
}

function normalize(value) {
  return value.normalize('NFKC').toLocaleLowerCase('zh-TW');
}

function renderStage(root, entries) {
  const videoPlayer = player();
  const list = element('ul', 'catalogue-grid');
  const status = element('p', 'catalogue-status');
  status.setAttribute('role', 'status');
  const searchLabel = element('label', 'catalogue-field');
  const search = element('input');
  search.type = 'search';
  search.placeholder = '輸入影片名稱或創作者';
  searchLabel.append(element('span', '', '搜尋影片'), search);

  const filterLabel = element('label', 'catalogue-field');
  const filter = element('select');
  filter.append(new Option('所有舞台', ''));
  const categories = new Set(entries.map(entry => entry.category));
  for (const category of categories) filter.append(new Option(category, category));
  filterLabel.append(element('span', '', '舞台'), filter);

  const controls = element('div', 'catalogue-controls');
  controls.append(searchLabel, filterLabel);
  const more = element('button', 'catalogue-button catalogue-more', '載入更多');
  more.type = 'button';

  const searchable = entries.map(entry => ({
    entry,
    text: normalize([entry.name, entry.category, entry.description, entry.creator].filter(Boolean).join(' ')),
  }));
  let matching = [];
  let shown = 0;

  function appendPage(focusNewCards = false) {
    const cards = matching.slice(shown, shown + PAGE_SIZE).map(({ entry }) => stageCard(entry, videoPlayer));
    list.append(...cards);
    shown += cards.length;
    more.hidden = shown >= matching.length;
    status.textContent = matching.length
      ? `顯示 ${shown}／${matching.length} 支影片`
      : '找不到符合條件的影片。';
    if (focusNewCards) cards[0]?.querySelector('a')?.focus();
  }

  function applyFilters() {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    matching = searchable.filter(({ entry, text }) =>
      (!filter.value || entry.category === filter.value) && terms.every(term => text.includes(term)));
    list.replaceChildren();
    shown = 0;
    appendPage();
  }

  search.addEventListener('input', applyFilters);
  filter.addEventListener('change', applyFilters);
  more.addEventListener('click', () => appendPage(true));
  root.replaceChildren(controls, status, list, more, videoPlayer.dialog);
  applyFilters();
}

export async function mountStage(root) {
  const status = element('p', 'catalogue-status', '正在載入舞台影片…');
  status.setAttribute('role', 'status');
  root.replaceChildren(status);

  try {
    const response = await fetch('/data/stage.json', { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderStage(root, stageEntries(await response.json()));
  } catch {
    status.textContent = '暫時無法載入舞台影片。';
    const retry = element('button', 'catalogue-button', '重新載入');
    retry.type = 'button';
    retry.addEventListener('click', () => mountStage(root), { once: true });
    root.replaceChildren(status, retry);
  }
}
