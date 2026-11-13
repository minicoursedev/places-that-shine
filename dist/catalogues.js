const pageSize = 9;
const validId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const designersPath = '/data/designers.json';
const detailRequests = new WeakMap();
let designerData;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function textValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeUrl(value, { external = false } = {}) {
  if (!textValue(value)) return null;
  try {
    const url = external ? new URL(value) : new URL(value, document.baseURI);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:' || (!external && url.origin === location.origin && url.protocol === 'http:')) return url;
    return null;
  } catch {
    return null;
  }
}

function enabledEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('目錄資料格式不正確');
  return entries.filter(entry => entry && entry.disabled !== true && validId.test(textValue(entry.id)));
}

function designerHash(designerId, workId) {
  const base = `#designers/${encodeURIComponent(designerId)}`;
  return workId ? `${base}/${encodeURIComponent(workId)}` : base;
}

function imageEntries(images) {
  return (Array.isArray(images) ? images : []).flatMap(image => {
    if (image?.disabled === true) return [];
    const url = safeUrl(typeof image === 'string' ? image : image?.url);
    return url ? [{ url: url.href, alt: textValue(image?.alt) }] : [];
  });
}

function designerEntries(data) {
  return enabledEntries(data?.designers).map((designer, index) => {
    const works = (Array.isArray(designer.works) ? enabledEntries(designer.works) : []).map(work => ({
      id: work.id,
      name: textValue(work.title),
      description: textValue(work.description),
      images: imageEntries(work.images),
      link: work.link,
      ...stageMedia(work.videoUrl),
    })).filter(work => work.name);
    const avatar = safeUrl(typeof designer.logo === 'string' ? designer.logo : designer.logo?.url)?.href;
    return {
      id: designer.id,
      boothColor: ['terracotta', 'sage', 'ochre'][index % 3],
      name: textValue(designer.name),
      category: textValue(designer.category) || '設計師',
      description: textValue(designer.description || designer.bio),
      avatar,
      avatarFit: designer.logo?.fit === 'contain' ? 'contain' : 'cover',
      socials: Array.isArray(designer.socials) ? designer.socials : [],
      works,
      href: designerHash(designer.id),
    };
  }).filter(entry => entry.name);
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

function imageElement(url, alt) {
  const image = element('img');
  image.alt = alt || '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => image.remove(), { once: true });
  image.src = url;
  return image;
}

function player(id) {
  const dialog = element('dialog', 'catalogue-player');
  const heading = element('h3', 'catalogue-player-title');
  heading.id = id;
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
    if (typeof dialog.showModal !== 'function' || !(entry.embed || entry.file || entry.previewImage)) return;
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
    } else if (entry.previewImage) {
      media = imageElement(entry.previewImage, entry.imageAlt);
    } else {
      media = element('video');
      media.src = entry.file;
      media.controls = true;
      media.playsInline = true;
    }
    body.replaceChildren(media);
    const label = entry.embed ? '在 YouTube 開啟 ↗' : (entry.previewImage ? '開啟原始圖片 ↗' : '開啟影片原檔 ↗');
    footer.replaceChildren(externalLink(entry.url, 'catalogue-source-link', label));
    if (entry.description && !entry.previewImage) {
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
  if (entry.image) cover.append(imageElement(entry.image, entry.imageAlt));
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

function boothLogo(designer) {
  const logo = element('div', `catalogue-designer-avatar catalogue-avatar-${designer.avatarFit}`);
  if (designer.avatar) logo.append(imageElement(designer.avatar, ''));
  return logo;
}

function boothCard(designer, representativeOnly) {
  const item = element('li', 'catalogue-booth');
  item.setAttribute('data-booth-color', designer.boothColor);
  const sign = element('div', 'catalogue-booth-sign');
  if (designer.avatar) sign.append(boothLogo(designer));
  const identity = element('div', 'catalogue-booth-identity');
  identity.append(
    element('p', 'catalogue-booth-category', designer.category),
    element('h3', 'catalogue-booth-name', designer.name),
  );
  sign.append(identity);

  const wall = element('div', 'catalogue-booth-wall');
  const shelf = element('div', 'catalogue-booth-shelf');
  shelf.id = `booth-shelf-${designer.id}`;
  const representative = designer.works.find(work => (work.images[0]?.url || work.image) && work.images[0]?.url !== designer.avatar);
  const displayedWorks = representativeOnly ? [representative || designer.works[0]].filter(Boolean) : designer.works;
  if (representativeOnly) shelf.classList.add('catalogue-booth-shelf-compact');
  for (const work of displayedWorks) {
    const frame = element('a', 'catalogue-booth-frame');
    frame.href = designerHash(designer.id, work.id);
    frame.setAttribute('aria-label', `查看作品 ${work.name}`);
    const cover = work.images[0]?.url || work.image;
    if (cover) frame.append(imageElement(cover, ''));
    else frame.append(element('span', 'catalogue-booth-frame-label', work.name));
    shelf.append(frame);
  }
  if (displayedWorks.length) wall.append(shelf);
  else wall.append(element('p', 'catalogue-booth-empty', '目前沒有公開作品'));

  const counter = element('div', 'catalogue-booth-counter');
  const visit = element('a', 'catalogue-booth-visit', '逛攤位 →');
  visit.href = designer.href;
  visit.setAttribute('aria-label', `逛攤位 ${designer.name}`);
  const count = element('span', 'catalogue-booth-count', `${designer.works.length} 件作品`);
  counter.append(visit, count);

  if (displayedWorks.length > 3) {
    const controls = element('div', 'catalogue-shelf-controls');
    const previous = element('button', '', '←');
    const next = element('button', '', '→');
    for (const [button, label, direction] of [[previous, '上一組作品', -1], [next, '下一組作品', 1]]) {
      button.type = 'button';
      button.setAttribute('aria-label', `${designer.name}：${label}`);
      button.setAttribute('aria-controls', shelf.id);
      button.addEventListener('click', () => shelf.scrollBy({ left: shelf.clientWidth * direction }));
    }
    previous.disabled = true;
    shelf.addEventListener('scroll', () => {
      previous.disabled = shelf.scrollLeft <= 1;
      next.disabled = shelf.scrollLeft + shelf.clientWidth >= shelf.scrollWidth - 1;
    }, { passive: true });
    controls.append(previous, next);
    counter.append(controls);
  }

  item.append(sign, element('div', 'catalogue-booth-awning'), wall, counter);
  return item;
}

function normalize(value) {
  return value.normalize('NFKC').toLocaleLowerCase('zh-TW');
}

function setupCatalogue(root, entries, config) {
  const videoPlayer = config.isVideo ? player('catalogue-stage-player-title') : null;
  const list = element('ul', config.isVideo ? 'catalogue-grid' : 'catalogue-market');
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

  let representativeOnly = false;
  if (!config.isVideo) {
    list.id = 'designer-booths';
    const toggle = element('button', 'catalogue-button catalogue-market-toggle', '只看代表作');
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', list.id);
    toggle.addEventListener('click', () => {
      representativeOnly = !representativeOnly;
      toggle.textContent = representativeOnly ? '顯示全部作品' : '只看代表作';
      const visible = shown;
      shown = 0;
      list.replaceChildren();
      appendPage(visible);
    });
    controls.append(toggle);
  }

  const searchable = entries.map(entry => ({
    entry,
    text: normalize([entry.name, entry.category, entry.description, entry.creator].filter(Boolean).join(' ')),
  }));
  let matching = [];
  let shown = 0;

  function appendPage(limit = pageSize, focusNewCards = false) {
    const cards = matching.slice(shown, shown + limit).map(({ entry }) =>
      videoPlayer ? stageCard(entry, videoPlayer) : boothCard(entry, representativeOnly));
    list.append(...cards);
    shown += cards.length;
    more.hidden = shown >= matching.length;
    status.textContent = matching.length
      ? `顯示 ${shown}／${matching.length} ${config.countUnit}`
      : config.empty;
    if (focusNewCards) cards[0]?.querySelector(videoPlayer ? 'a' : '.catalogue-booth-visit')?.focus();
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
  more.addEventListener('click', () => appendPage(pageSize, true));
  root.replaceChildren(controls, status, list, more);
  if (videoPlayer) root.append(videoPlayer.dialog);
  applyFilters();
}

async function readData(path) {
  const response = await fetch(path, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function loadDesigners() {
  if (!designerData) {
    designerData = readData(designersPath).then(designerEntries).catch(error => {
      designerData = undefined;
      throw error;
    });
  }
  return designerData;
}

function retryButton(retry) {
  const button = element('button', 'catalogue-button', '重新載入');
  button.type = 'button';
  button.addEventListener('click', retry, { once: true });
  return button;
}

async function mountCatalogue(root, config) {
  const status = element('p', 'catalogue-status', `正在載入${config.unit}…`);
  status.setAttribute('role', 'status');
  root.replaceChildren(status);

  try {
    setupCatalogue(root, await config.load(), config);
  } catch {
    status.textContent = `暫時無法載入${config.unit}。`;
    root.replaceChildren(status, retryButton(() => mountCatalogue(root, config)));
  }
}

export function mountDesigners(root) {
  return mountCatalogue(root, {
    load: loadDesigners,
    unit: '設計師資料', countUnit: '攤', placeholder: '輸入設計師或品牌名稱', searchLabel: '搜尋設計師',
    filterLabel: '創作類別', all: '所有類別', empty: '找不到符合條件的設計師。',
  });
}

export function mountStage(root) {
  return mountCatalogue(root, {
    load: async () => stageEntries(await readData('/data/stage.json')), isVideo: true,
    unit: '舞台影片', countUnit: '支影片', placeholder: '輸入影片名稱或創作者', searchLabel: '搜尋影片',
    filterLabel: '舞台', all: '所有舞台', empty: '找不到符合條件的影片。',
  });
}

function detailTitle(name) {
  const title = element('h1', 'catalogue-detail-title', name);
  title.id = 'designers-detail-title';
  title.setAttribute('data-designer-title', '');
  title.tabIndex = -1;
  return title;
}

function backLink(backHash) {
  const back = element('a', 'catalogue-back', '← 返回設計師市集');
  back.href = backHash;
  return back;
}

function socialLink(link, fallbackLabel) {
  const url = safeUrl(typeof link === 'string' ? link : link?.url, { external: true });
  if (!url || url.origin === location.origin) return null;
  const label = textValue(link?.label) || fallbackLabel;
  return externalLink(url.href, 'catalogue-source-link', `${label} ↗`);
}

function workArticle(work, designerId, mediaPlayer) {
  const article = element('article', 'catalogue-work');
  const heading = element('h3', 'catalogue-work-title');
  heading.setAttribute('data-work-title', work.id);
  heading.tabIndex = -1;
  const title = element('a', '', work.name);
  title.href = designerHash(designerId, work.id);
  heading.append(title);
  article.append(heading);

  if (work.description) article.append(element('p', 'catalogue-work-description', work.description));
  if (work.images.length) {
    const gallery = element('div', 'catalogue-work-gallery');
    for (const { url, alt } of work.images) {
      const imageAlt = alt || work.name;
      const preview = externalLink(url, 'catalogue-work-image');
      preview.append(imageElement(url, imageAlt));
      preview.setAttribute('aria-label', `放大圖片：${imageAlt}`);
      preview.addEventListener('click', event => mediaPlayer.open({ name: work.name, previewImage: url, url, imageAlt }, event));
      gallery.append(preview);
    }
    article.append(gallery);
  }

  const links = element('div', 'catalogue-work-links');
  if (work.url) {
    const video = externalLink(work.url, 'catalogue-source-link', '觀看作品影片 →');
    video.addEventListener('click', event => mediaPlayer.open(work, event));
    links.append(video);
  }
  const original = socialLink(work.link, '作品連結');
  if (original) links.append(original);
  if (links.childElementCount) article.append(links);
  return { article, heading };
}

function renderDesigner(root, designer, workId, request, backHash) {
  const booth = element('div', 'catalogue-booth catalogue-booth-open');
  booth.setAttribute('data-booth-color', designer.boothColor);
  const sign = element('div', 'catalogue-booth-sign');
  if (designer.avatar) sign.append(boothLogo(designer));
  const identity = element('div', 'catalogue-booth-identity');
  identity.append(element('p', 'catalogue-booth-category', designer.category), detailTitle(designer.name));
  sign.append(identity);

  const wall = element('div', 'catalogue-booth-wall');
  if (designer.description) wall.append(element('p', 'catalogue-designer-bio', designer.description));
  const socials = designer.socials.map(link => socialLink(link, '官方連結')).filter(Boolean);
  if (socials.length) {
    const links = element('div', 'catalogue-designer-socials');
    links.append(...socials);
    wall.append(links);
  }
  const works = element('section', 'catalogue-works');
  works.append(element('h2', 'catalogue-works-title', '攤位作品'));
  const rack = element('div', 'catalogue-booth-rack');
  const mediaPlayer = player('catalogue-work-player-title');
  const found = new Map();
  for (const work of designer.works) {
    const { article, heading } = workArticle(work, designer.id, mediaPlayer);
    found.set(work.id, heading);
    rack.append(article);
  }
  if (designer.works.length) works.append(rack);
  else works.append(element('p', 'catalogue-status', '這個攤位目前沒有公開作品。'));

  const target = found.get(workId);
  const missingWork = workId && !target ? element('p', 'catalogue-status', '這件作品已下架或找不到。') : null;
  if (missingWork) {
    missingWork.setAttribute('role', 'status');
    wall.append(missingWork);
  }
  wall.append(works);
  booth.append(sign, element('div', 'catalogue-booth-awning'), wall, element('div', 'catalogue-booth-counter'));
  root.replaceChildren(backLink(backHash), booth, mediaPlayer.dialog);
  if (target) {
    requestAnimationFrame(() => {
      if (detailRequests.get(root) !== request || !target.isConnected) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'start' });
    });
  }
  return { workFound: Boolean(target) };
}

export async function showDesigner(root, id, workId, { backHash = '#designers/list' } = {}) {
  const request = {};
  detailRequests.set(root, request);
  const loading = element('p', 'catalogue-status', '正在載入設計師資料…');
  loading.setAttribute('role', 'status');
  root.replaceChildren(backLink(backHash), loading);

  try {
    const entries = await loadDesigners();
    if (detailRequests.get(root) !== request) return;
    const designer = entries.find(entry => entry.id === id);
    if (designer) return renderDesigner(root, designer, workId, request, backHash);
    root.replaceChildren(backLink(backHash), detailTitle('找不到這位設計師'));
  } catch {
    if (detailRequests.get(root) !== request) return;
    root.replaceChildren(backLink(backHash), detailTitle('暫時無法載入設計師資料'), retryButton(() => showDesigner(root, id, workId, { backHash })));
  }
}
