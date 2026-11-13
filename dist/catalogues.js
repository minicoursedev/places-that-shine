const source = new URL('https://minicourse.dev/puma_oshen_wave/');
const pageSize = 9;
const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function textValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function httpsUrl(value) {
  if (!textValue(value)) return null;
  try {
    const url = new URL(value, source);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function enabledEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('目錄資料格式不正確');
  return entries.filter(entry => entry && entry.disabled !== true && validId.test(textValue(entry.id)));
}

function designerEntries(data) {
  return enabledEntries(data?.designers).map(designer => {
    const name = textValue(designer.name);
    const images = Array.isArray(designer.productImages) ? designer.productImages : [];
    const work = images.find(image => image?.disabled !== true && httpsUrl(image?.url));
    const avatar = designer.logo?.status === 'verified' ? httpsUrl(designer.logo.url) : null;
    return {
      name,
      category: textValue(designer.category) || '設計師',
      description: textValue(designer.description),
      image: httpsUrl(work?.url) || avatar,
      imageAlt: textValue(work?.alt),
      href: new URL(`designer/profiles/${encodeURIComponent(designer.id)}/`, source),
    };
  }).filter(entry => entry.name);
}

function stageMedia(value) {
  const url = httpsUrl(value);
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
  return enabledEntries(data?.stages).map(stage => ({
    name: textValue(stage.title),
    creator: textValue(stage.creator),
    category: halls.get(stage.hall) || '公共舞台',
    description: textValue(stage.description),
    href: new URL(`stage/videos/${encodeURIComponent(stage.id)}/`, source),
    ...stageMedia(stage.url),
  })).filter(entry => entry.name);
}

function externalLink(href, className, label) {
  const link = element('a', className, label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function player() {
  const dialog = element('dialog', 'catalogue-player');
  const heading = element('h3', 'catalogue-player-title');
  heading.id = 'catalogue-player-title';
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
    const media = element(entry.embed ? 'iframe' : 'video');
    if (entry.embed) {
      media.src = entry.embed;
      media.title = entry.name;
      media.referrerPolicy = 'strict-origin-when-cross-origin';
      media.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      media.allowFullscreen = true;
    } else {
      media.src = entry.file;
      media.controls = true;
      media.playsInline = true;
    }
    body.replaceChildren(media);
    footer.replaceChildren(
      externalLink(entry.url, 'catalogue-source-link', entry.embed ? '在 YouTube 開啟 ↗' : '開啟影片原檔 ↗'),
      externalLink(entry.href, 'catalogue-source-link', '查看洋流舞台頁面 ↗'),
    );
    dialog.showModal();
  }

  return { dialog, open };
}

function card(entry, videoPlayer) {
  const item = element('li', 'catalogue-card');
  const isVideo = Boolean(videoPlayer);
  const link = externalLink(isVideo ? entry.url || entry.href : entry.href, 'catalogue-card-link');
  const cover = element('div', `catalogue-cover${isVideo ? ' catalogue-cover-video' : ''}`);
  if (entry.image) {
    const image = element('img');
    image.alt = entry.imageAlt || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = entry.image;
    cover.append(image);
  }
  if (isVideo) {
    const play = element('span', 'catalogue-play');
    play.setAttribute('aria-hidden', 'true');
    cover.append(play);
    link.addEventListener('click', event => videoPlayer.open(entry, event));
  }
  const content = element('div', 'catalogue-card-content');
  const title = element('h3', 'catalogue-card-title', entry.name);
  content.append(element('p', 'catalogue-card-category', entry.category), title);
  const detail = isVideo ? entry.creator : entry.description;
  if (detail && (!isVideo || detail !== entry.category)) {
    content.append(element('p', 'catalogue-card-detail', detail));
  }
  const action = element('span', 'catalogue-card-action', isVideo ? '觀看影片' : '瀏覽作品');
  const arrow = element('span', '', isVideo ? '→' : '↗');
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

function setupCatalogue(root, entries, config) {
  const videoPlayer = config.isVideo ? player() : null;
  const list = element('ul', 'catalogue-grid');
  const status = element('p', 'catalogue-status');
  status.setAttribute('role', 'status');
  const searchLabel = element('label', 'catalogue-field');
  const search = element('input');
  search.type = 'search';
  search.placeholder = config.placeholder;
  searchLabel.append(element('span', '', config.searchLabel), search);

  const filterLabel = element('label', 'catalogue-field');
  const filter = element('select');
  filter.append(new Option(config.all, ''));
  const categories = [...new Set(entries.map(entry => entry.category))];
  for (const category of categories) filter.append(new Option(category, category));
  filterLabel.append(element('span', '', config.filterLabel), filter);

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
    const cards = matching.slice(shown, shown + pageSize).map(({ entry }) => card(entry, videoPlayer));
    list.append(...cards);
    shown += cards.length;
    more.hidden = shown >= matching.length;
    status.textContent = matching.length
      ? `顯示 ${shown}／${matching.length} 筆${config.unit}`
      : config.empty;
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
  root.replaceChildren(controls, status, list, more);
  if (videoPlayer) root.append(videoPlayer.dialog);
  applyFilters();
}

async function mountCatalogue(root, config) {
  const status = element('p', 'catalogue-status', `正在載入${config.unit}…`);
  status.setAttribute('role', 'status');
  root.replaceChildren(status);

  try {
    const response = await fetch(new URL(config.path, source), {
      credentials: 'omit',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setupCatalogue(root, config.entries(await response.json()), config);
  } catch {
    status.textContent = `暫時無法載入${config.unit}。`;
    const retry = element('button', 'catalogue-button', '重新載入');
    retry.type = 'button';
    retry.addEventListener('click', () => mountCatalogue(root, config), { once: true });
    const actions = element('div', 'catalogue-error-actions');
    actions.append(retry, externalLink(new URL(config.directory, source), 'catalogue-source-link', '前往洋流原站 ↗'));
    root.replaceChildren(status, actions);
  }
}

export function mountDesigners(root) {
  return mountCatalogue(root, {
    path: 'designer.json', directory: 'designer/', entries: designerEntries,
    unit: '設計師資料', placeholder: '輸入設計師或品牌名稱', searchLabel: '搜尋設計師',
    filterLabel: '創作類別', all: '所有類別', empty: '找不到符合條件的設計師。',
  });
}

export function mountStage(root) {
  return mountCatalogue(root, {
    path: 'stage/videos.json', directory: 'stage/', entries: stageEntries, isVideo: true,
    unit: '舞台影片', placeholder: '輸入影片名稱或創作者', searchLabel: '搜尋影片',
    filterLabel: '舞台', all: '所有舞台', empty: '找不到符合條件的影片。',
  });
}
