import { readStores } from '../lib/oshen-store-data';
import { storeCategoryPath, storeCity, storeMapCenterParam, storeMapId, storePath } from '../lib/oshen-store-links.mjs';
import { storeCategoryIcon } from './store-marker-icons.js';
import { createStoreShare } from './store-share.js';
import { createStoreCategoryNavigation, storeCategoryFromPath } from './store-category-navigation.js';
import { createStoreEventFilter } from './store-events.js';

const STORE_FEED = '/data/stores.json';
const PAGE_SIZE = 12;
const MAP_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TAIWAN_BOUNDS = [[21.88, 117.97], [26.42, 122.05]];
const compareText = new Intl.Collator('zh-Hant-TW').compare;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function normalize(text) {
  return text.normalize('NFKC').replaceAll('台', '臺').toLowerCase().trim();
}

function localPhotoUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin ? url : null;
  } catch {
    return null;
  }
}

function externalLink(label, url, name) {
  const link = element('a', 'store-link', `${label} ↗`);
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${name}的${label}（在新分頁開啟）`);
  return link;
}

function connectPhotoControls(track, previous, next) {
  function move(direction) {
    const first = track.firstElementChild;
    const second = first?.nextElementSibling;
    if (!second) return;
    const step = second.offsetLeft - first.offsetLeft;
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    track.scrollBy({ left: step * direction, behavior });
  }

  function sync() {
    previous.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', sync, { passive: true });
  return sync;
}

function createStorePhotoViewer(dialog) {
  const track = dialog.querySelector('.store-photo-track');
  const previous = dialog.querySelector('[data-photo-previous]');
  const next = dialog.querySelector('[data-photo-next]');
  const sync = connectPhotoControls(track, previous, next);
  dialog.querySelector('.store-photo-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    (event.key === 'ArrowLeft' ? previous : next).click();
  });

  return (photos, selected) => {
    track.replaceChildren(...photos.map((photo, index) => {
      const slide = element('figure', 'store-photo-slide');
      const image = element('img');
      image.alt = photo.alt;
      image.draggable = false;
      image.loading = index === selected ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.src = photo.url.href;
      slide.append(image, element('figcaption', 'store-photo-caption', photo.caption ?? photo.alt));
      return slide;
    }));
    previous.hidden = next.hidden = photos.length < 2;
    dialog.showModal();
    track.scrollLeft = selected * track.clientWidth;
    sync();
  };
}

function renderStoreGallery(photos, openPhotos) {
  const gallery = element('section', 'store-gallery');
  gallery.setAttribute('aria-label', '店家照片');
  const header = element('div', 'store-gallery-heading');
  header.append(element('h4', '', '店家照片'));
  const track = element('div', 'store-gallery-track');

  for (const [index, photo] of photos.entries()) {
    const thumb = element('button', 'store-gallery-thumb');
    thumb.type = 'button';
    thumb.setAttribute('aria-label', `放大${photo.alt}`);
    thumb.setAttribute('aria-haspopup', 'dialog');
    thumb.setAttribute('aria-controls', 'store-photo-viewer');
    const image = element('img');
    image.alt = photo.alt;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.draggable = false;
    image.src = photo.url.href;
    thumb.append(image, element('span', 'store-gallery-caption', photo.caption ?? photo.alt));
    thumb.addEventListener('click', () => openPhotos(photos, index));
    track.append(thumb);
  }

  if (photos.length > 1) {
    const controls = element('div', 'store-gallery-controls');
    const previous = element('button', 'store-gallery-arrow store-gallery-previous');
    const next = element('button', 'store-gallery-arrow');
    previous.type = next.type = 'button';
    previous.setAttribute('aria-label', '上一張照片');
    next.setAttribute('aria-label', '下一張照片');
    previous.disabled = true;
    connectPhotoControls(track, previous, next);
    controls.append(previous, next);
    header.append(controls);
  }

  gallery.append(header, track);
  return gallery;
}

function renderVisitRecords(records, name) {
  const details = element('details', 'store-details');
  details.open = true;
  details.append(element('summary', '', `探店紀錄（${records.length}）`));

  for (const { author, source, excerpt, url, photo } of records) {
    const entry = element('div', 'store-visit-entry');
    const text = element('div', 'store-visit-text');
    if (author || source) {
      const byline = element('p', 'store-visit-byline');
      if (author) byline.append(element('strong', '', author));
      if (source) byline.append(author ? ` · ${source}` : source);
      text.append(byline);
    }
    text.append(element('blockquote', 'store-visit-excerpt', excerpt));
    if (url) {
      const link = externalLink(source ? `閱讀 ${source} 原文` : '閱讀原文', url, name);
      link.className = 'store-visit-source';
      text.append(link);
    }
    entry.append(text);
    if (photo) {
      const image = element('img', 'store-visit-photo');
      image.alt = photo.alt ?? '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = photo.url.href;
      entry.append(image);
    }
    details.append(entry);
  }
  return details;
}

function renderStore(shop, openShare, openPhotos, tag = 'li', onSelect) {
  const { id, name, address, category, serviceType, logo, socialLinks, openingHours, visitNote, visitUrl, visitRecords, photos } = shop;
  const card = element(tag, 'store-card');
  const summary = element('div', 'store-summary');
  const text = element('div', 'store-text');
  const type = category === '洋流服務站' && serviceType
    ? `${category}・${serviceType}`
    : category;
  const heading = element('h3', 'store-name');
  const profile = element('a', '', name);
  profile.href = storePath(id);
  if (onSelect) profile.addEventListener('click', onSelect);
  heading.append(profile);
  text.append(element('p', 'store-category', type), heading);
  text.append(element('p', 'store-address', address));
  summary.append(text);

  if (logo) {
    const img = element('img', 'store-photo');
    img.alt = '';
    img.width = 54;
    img.height = 54;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = logo.url.href;
    summary.append(img);
  }

  const directions = new URL('https://www.google.com/maps/dir/');
  directions.searchParams.set('api', '1');
  directions.searchParams.set('destination', `${address} ${name}`);
  const navigation = externalLink('導航', directions, name);
  navigation.className = 'store-navigation';
  const actions = element('div', 'store-card-actions');
  if (typeof id === 'string' && id) {
    const share = element('button', 'store-action', '分享');
    share.type = 'button';
    share.setAttribute('aria-label', '分享店家');
    share.setAttribute('aria-haspopup', 'dialog');
    share.setAttribute('aria-controls', 'store-share-dialog');
    share.addEventListener('click', () => openShare({ id, name }));
    actions.append(share);
  }
  if (visitUrl) {
    const link = externalLink('探店', visitUrl, name);
    link.className = 'store-action store-visit';
    actions.append(link);
  }
  actions.append(navigation);
  const links = element('div', 'store-links');
  for (const { label, icon: file, url } of socialLinks) {
    const link = externalLink(label, url, name);
    link.title = label;
    const icon = element('img');
    icon.alt = '';
    icon.width = icon.height = 20;
    icon.decoding = 'async';
    icon.loading = 'lazy';
    icon.src = `/designers/assets/buttons/${file}`;
    link.replaceChildren(icon);
    links.append(link);
  }

  card.append(summary, actions);
  if (openingHours || visitNote) {
    const details = element('details', 'store-details');
    details.open = true;
    details.append(element('summary', '', '店家簡介'));
    if (openingHours) {
      details.append(element('strong', '', openingHours.label), element('p', 'store-hours', openingHours.text));
      if (openingHours.note) details.append(element('p', 'store-visit-note', openingHours.note));
    }
    if (visitNote) details.append(element('p', 'store-visit-note', visitNote));
    card.append(details);
  }
  if (visitRecords.length) card.append(renderVisitRecords(visitRecords, name));
  if (links.childElementCount) card.append(links);
  if (photos.length) card.append(renderStoreGallery(photos, openPhotos));
  return card;
}

function labelField(label, field) {
  const wrapper = element('label', 'store-field');
  wrapper.append(element('span', 'store-label', label), field);
  return wrapper;
}

function setOptions(select, allLabel, values) {
  select.replaceChildren(new Option(allLabel, ''));
  for (const value of [...new Set(values)].filter(Boolean).sort(compareText)) {
    select.add(new Option(value, value));
  }
}

function loadAsset(tag, url) {
  const node = element(tag);
  if (tag === 'link') {
    node.rel = 'stylesheet';
    node.href = url;
  } else {
    node.src = url;
  }
  return new Promise((resolve, reject) => {
    node.addEventListener('load', resolve, { once: true });
    node.addEventListener('error', () => {
      node.remove();
      reject(new Error(`無法載入地圖資源 ${url}`));
    }, { once: true });
    document.head.append(node);
  });
}

function createStorePin(L, shop, largeServiceMarkers) {
  const artwork = shop.mapMarker;
  const photo = largeServiceMarkers ? localPhotoUrl(artwork?.image) : null;
  const isArtwork = Boolean(photo && artwork.artwork);
  const badgeClass = photo ? (isArtwork ? 'store-artwork-pin' : 'store-portrait-pin') : 'store-category-pin';
  const badge = element('div', badgeClass);
  badge.classList.toggle('is-unverified', shop.verification === false);

  const width = photo ? artwork.width : 34;
  const height = photo ? artwork.height : 40;
  const scale = isArtwork ? .56 : 1;
  const size = [width * scale, height * scale];
  badge.style.width = `${size[0]}px`;
  badge.style.height = `${size[1]}px`;

  if (photo) {
    const img = element('img');
    img.src = photo.href;
    img.alt = '';
    badge.append(img);
    if (isArtwork && artwork.type) {
      const role = element('span', 'store-artwork-type', artwork.type);
      role.style.fontSize = `${Math.min(size[0] * .14, size[0] * .74 / [...artwork.type].length)}px`;
      if (artwork.blankTypeFooter) role.style.background = 'transparent';
      badge.append(role);
    }
  } else {
    badge.append(storeCategoryIcon(shop.category, shop.verification));
  }
  return {
    badge,
    icon: L.divIcon({ html: badge, className: 'store-marker', iconSize: size, iconAnchor: [size[0] / 2, size[1]] }),
  };
}

function createStoreSheet(panel, container, renderStoreDetails, mobile) {
  const sheet = element('section', 'store-sheet');
  sheet.hidden = true;
  sheet.setAttribute('aria-labelledby', 'store-sheet-title');
  const toolbar = element('div', 'store-sheet-toolbar');
  const handle = element('button', 'store-sheet-handle');
  handle.type = 'button';
  handle.setAttribute('aria-controls', 'store-sheet-content');
  const closeButton = element('button', 'store-sheet-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '關閉店家資訊');
  const backButton = element('button', 'store-action store-sheet-back', '返回店家清單');
  backButton.type = 'button';
  const content = element('div', 'store-sheet-content');
  content.id = 'store-sheet-content';
  toolbar.append(backButton, handle, closeButton);
  sheet.append(toolbar, content);
  panel.append(sheet);
  let selected;
  let expanded = false;
  let drag;
  let dragged = false;
  const blocked = [];

  function setExpanded(value) {
    expanded = value;
    sheet.classList.toggle('is-expanded', value);
    handle.setAttribute('aria-expanded', String(value));
    handle.setAttribute('aria-label', value ? '縮回店家資訊' : '全螢幕觀看店家資訊');
    if (value) {
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      // The full-height sheet covers its ancestors' sibling content.
      for (let node = sheet; node !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement.children) {
          if (sibling !== node && sibling instanceof HTMLElement && !sibling.inert && !(sibling instanceof HTMLDialogElement)) {
            sibling.inert = true;
            blocked.push(sibling);
          }
        }
      }
    } else {
      sheet.removeAttribute('role');
      sheet.removeAttribute('aria-modal');
      for (const sibling of blocked.splice(0)) sibling.inert = false;
    }
  }

  function finishDrag() {
    drag = null;
    sheet.classList.remove('is-dragging');
    sheet.style.removeProperty('--store-sheet-drag-height');
  }

  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    dragged = false;
    drag = { id: event.pointerId, start: event.clientY, height: sheet.getBoundingClientRect().height };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const distance = drag.start - event.clientY;
    if (!dragged && Math.abs(distance) < 8) return;
    dragged = true;
    sheet.classList.add('is-dragging');
    sheet.style.setProperty('--store-sheet-drag-height', `${drag.height + distance}px`);
  });
  handle.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    const distance = drag.start - event.clientY;
    finishDrag();
    if (Math.abs(distance) >= 40) {
      dragged = true;
      setExpanded(distance > 0);
    }
  });
  handle.addEventListener('lostpointercapture', finishDrag);
  handle.addEventListener('click', event => {
    if (event.detail === 0 || !dragged) setExpanded(!expanded);
  });
  setExpanded(false);

  function close(restoreFocus = false) {
    if (!selected) return;
    selected.badge?.classList.remove('is-selected');
    sheet.hidden = true;
    finishDrag();
    setExpanded(false);
    container.style.removeProperty('--store-map-top');
    container.classList.remove('has-store-sheet');
    content.replaceChildren();
    if (restoreFocus) (selected.trigger || selected.marker?.getElement())?.focus({ preventScroll: true });
    selected = null;
  }

  closeButton.addEventListener('click', () => close(true));
  backButton.addEventListener('click', () => close(true));
  sheet.addEventListener('keydown', event => {
    if (event.key === 'Escape') close(true);
  });

  function syncMapTop() {
    if (!selected || !mobile.matches) return;
    const top = container.getBoundingClientRect().top + window.scrollY;
    container.style.setProperty('--store-map-top', `${top}px`);
  }

  return {
    open(shop, marker, badge, trigger) {
      selected?.badge?.classList.remove('is-selected');
      selected = { marker, badge, trigger };
      badge?.classList.add('is-selected');
      const card = renderStoreDetails(shop);
      card.querySelector('.store-name').id = 'store-sheet-title';
      content.replaceChildren(card);
      content.scrollTop = 0;
      sheet.hidden = false;
      syncMapTop();
      container.classList.add('has-store-sheet');
      (mobile.matches ? closeButton : backButton).focus({ preventScroll: true });
    },
    close,
    syncMapTop,
  };
}

function storeCoordinates(shop) {
  return shop.latlng ? [shop.latlng.lat, shop.latlng.lng] : null;
}

async function createStoreMap(container, message, mapButtons, sheet, mobile, onSelectMobileStore, connectedGroups) {
  await Promise.all([
    loadAsset('link', '/vendor/leaflet/leaflet.css?v=20261123-webp'),
    loadAsset('link', '/vendor/leaflet-markercluster/MarkerCluster.css'),
    loadAsset('script', '/vendor/leaflet/leaflet.js?v=20261123-webp'),
  ]);
  await loadAsset('script', '/vendor/leaflet-markercluster/leaflet.markercluster.js');
  const L = globalThis.L;
  const map = L.map(container, { scrollWheelZoom: false, maxZoom: 19 });
  let userMarker;
  let pendingFocus;
  function closeDetails() {
    pendingFocus = null;
    sheet.close();
  }
  map.on('click', () => {
    if (!mobile.matches) closeDetails();
  });
  map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-in').setAttribute('aria-label', '放大地圖');
  map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-out').setAttribute('aria-label', '縮小地圖');
  const actions = L.control({ position: 'bottomright' });
  actions.onAdd = () => {
    const control = element('div', 'store-map-actions');
    control.append(...mapButtons);
    L.DomEvent.disableClickPropagation(control);
    return control;
  };

  let tileLoaded = false;
  const tiles = L.tileLayer(MAP_TILES, {
    maxZoom: 19,
    referrerPolicy: 'strict-origin-when-cross-origin',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });
  tiles.on('loading', () => { tileLoaded = false; });
  tiles.on('tileload', () => { tileLoaded = true; });
  tiles.on('load', () => {
    message.textContent = tileLoaded ? '' : '底圖目前無法載入，仍可選取標記查看店家，或切換回清單。';
    message.hidden = tileLoaded;
  });
  tiles.addTo(map);
  actions.addTo(map);

  const connections = connectedGroups.length ? L.polyline([], {
    color: '#9a451e', weight: 4, opacity: .95, dashArray: '7 6',
    interactive: false, className: 'store-event-connections',
  }).addTo(map) : null;
  const markers = L.markerClusterGroup({
    maxClusterRadius: 45,
    disableClusteringAtZoom: connections ? 17 : null,
    showCoverageOnHover: false,
    spiderfyDistanceMultiplier: 1.8,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount();
      const label = element('span', '', String(count));
      label.setAttribute('aria-label', `${count} 間店家，點擊展開`);
      label.title = `${count} 間店家，點擊展開`;
      return L.divIcon({
        className: 'store-cluster',
        html: label,
        iconSize: [44, 44],
      });
    },
  }).addTo(map);

  return {
    closeDetails,
    centerPosition() {
      const { lat, lng } = map.getCenter();
      return { latitude: lat, longitude: lng };
    },
    locate({ latitude, longitude }) {
      const position = [latitude, longitude];
      closeDetails();
      map.invalidateSize({ pan: false });
      if (userMarker) userMarker.setLatLng(position);
      else {
        userMarker = L.circleMarker(position, {
          radius: 8, color: '#fff', weight: 3, fillColor: '#009a50', fillOpacity: 1,
          className: 'store-user-location',
        }).addTo(map).bindTooltip('我的位置');
      }
      map.setView(position, 16, { animate: false });
    },
    sortByDistance(stores, { latitude, longitude }) {
      const origin = L.latLng(latitude, longitude);
      return stores.map(shop => {
        const position = storeCoordinates(shop);
        return { shop, distance: position ? origin.distanceTo(L.latLng(position)) : Number.MAX_VALUE };
      }).sort((a, b) => a.distance - b.distance).map(({ shop }) => shop);
    },
    resize() {
      map.invalidateSize({ pan: false });
    },
    focusStore(id, trigger) {
      const marker = markers.getLayers().find(pin => pin.options.storeId === id);
      if (!marker) return false;
      const selection = pendingFocus = { marker };
      const center = marker.getLatLng();
      container.scrollIntoView({ block: 'nearest' });
      map.setView(center, 16, { animate: false });
      markers.zoomToShowLayer(marker, () => {
        if (pendingFocus !== selection) return;
        pendingFocus = null;
        if (container.offsetWidth && markers.hasLayer(marker)) marker.fire('click', { trigger, center });
      });
      return true;
    },
    refresh(stores, category, focusId, preserveView = false) {
      const previousView = preserveView && !focusId && Number.isFinite(map.getZoom())
        ? { center: map.getCenter(), zoom: map.getZoom() }
        : null;
      map.invalidateSize({ pan: false });
      map.removeLayer(markers);
      markers.clearLayers();
      const pins = [];
      let center;
      for (const shop of stores) {
        const position = storeCoordinates(shop);
        if (!position) continue;
        const { badge, icon } = createStorePin(L, shop, category === '洋流服務站');
        const marker = L.marker(position, { title: shop.name, alt: shop.name, icon, storeId: shop.id });
        if (shop.id === focusId) center = marker.getLatLng();
        marker.on('add', () => {
          const button = marker.getElement();
          button.setAttribute('aria-label', shop.name);
          button.onkeydown = event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            button.click();
          };
        });
        marker.on('click', ({ trigger, center }) => {
          pendingFocus = null;
          if (!mobile.matches && badge.classList.contains('is-selected')) return;
          if (mobile.matches) onSelectMobileStore();
          sheet.open(shop, marker, badge, trigger);
          map.invalidateSize({ pan: false });
          if (center) map.panTo(center, { animate: false });
          else map.panInside(marker.getLatLng(), { paddingTopLeft: [35, 58], paddingBottomRight: [35, 35], animate: false });
        });
        pins.push(marker);
      }
      if (connections) {
        const positions = new Map(pins.map(pin => [pin.options.storeId, pin.getLatLng()]));
        const lines = connectedGroups.map(group => {
          const points = group.storeIds.map(id => positions.get(id)).filter(Boolean);
          if (group.closedLoop && points.length > 2) points.push(points[0]);
          return points;
        });
        connections.setLatLngs(lines.filter(points => points.length > 1));
      }
      if (center) map.setView(center, 16, { animate: false });
      else if (!previousView) {
        const bounds = pins.length ? L.latLngBounds(pins.map(pin => pin.getLatLng())) : TAIWAN_BOUNDS;
        map.fitBounds(bounds, { animate: false, padding: [28, 28], maxZoom: connections ? 19 : 15 });
      }
      markers.addLayers(pins);
      markers.addTo(map);
      if (previousView) map.setView(previousView.center, previousView.zoom, { animate: false });
    },
  };
}

export async function mountStores(root, workPreviews = [], initialCategory = '') {
  const navigateCategoryPage = createStoreCategoryNavigation(root);
  let activeCategory = initialCategory;
  const mobile = window.matchMedia('(max-width: 560px)');
  const openShare = createStoreShare(document.getElementById('store-share-dialog'));
  const openPhotos = createStorePhotoViewer(document.getElementById('store-photo-viewer'));
  let previousWork = -1;
  function linkedStoreId() {
    return new URLSearchParams(location.search).get(storeMapCenterParam) || storeMapId(location.hash);
  }
  let pendingStoreId = linkedStoreId();

  function renderStoreDetails(shop) {
    const card = renderStore(shop, openShare, openPhotos, 'article');
    if (workPreviews.length) {
      const avoidRepeat = previousWork >= 0 && workPreviews.length > 1;
      const index = Math.floor(Math.random() * (workPreviews.length - Number(avoidRepeat)));
      previousWork = avoidRepeat && index >= previousWork ? index + 1 : index;
      const work = workPreviews[previousWork];
      const link = element('a', 'store-work-preview-link');
      link.href = work.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', `查看${work.designerName}的作品「${work.label}」（在新分頁開啟）`);
      const image = element('img');
      image.alt = work.label;
      if (work.width && work.height) {
        image.width = work.width;
        image.height = work.height;
      }
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = work.image;
      const cover = element('span', 'store-work-preview-cover');
      cover.append(image, element('span', 'store-work-preview-designer', work.designerName));
      link.append(cover);
      const divider = element('h4', 'store-work-preview-divider', '✦');
      divider.setAttribute('aria-label', '分享設計師');
      card.append(divider, link);
    }
    return card;
  }

  const controls = element('div', 'store-controls');
  const search = element('input', 'store-input');
  search.type = 'search';
  search.placeholder = '輸入店名或地址';
  search.autocomplete = 'off';
  const city = element('select', 'store-input');
  const category = element('select', 'store-input');
  setOptions(city, '全部縣市', []);
  setOptions(category, '全部店別', []);
  const filterToggle = element('button', 'store-action store-filter-toggle', '篩選');
  filterToggle.type = 'button';
  filterToggle.setAttribute('aria-controls', 'store-filters');
  filterToggle.setAttribute('aria-expanded', 'false');
  const filters = element('div', 'store-filters');
  filters.id = 'store-filters';
  filters.append(labelField('縣市', city), labelField('店別', category));
  controls.append(labelField('搜尋', search), filterToggle, filters);

  const feedback = element('p', 'store-feedback');
  feedback.setAttribute('role', 'status');
  const modes = element('div', 'store-modes');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', '店家瀏覽方式');
  const listMode = element('button', 'store-action', '店家清單');
  const mapMode = element('button', 'store-action', '店家地圖');
  listMode.type = mapMode.type = 'button';
  listMode.setAttribute('aria-pressed', 'false');
  mapMode.setAttribute('aria-pressed', 'true');
  modes.append(listMode, mapMode);
  const tools = element('div', 'store-tools');
  tools.id = 'store-tools';
  tools.append(controls, modes);
  const toolsToggle = element('button', 'back-link store-tools-toggle');
  toolsToggle.type = 'button';
  toolsToggle.setAttribute('aria-controls', tools.id);
  root.closest('.stores-directory').querySelector('.directory-header').append(toolsToggle);
  const retry = element('button', 'store-action', '重新載入');
  const more = element('button', 'store-action store-more', '顯示更多店家');
  retry.type = more.type = 'button';
  retry.hidden = more.hidden = true;
  const list = element('ul', 'store-results');
  list.setAttribute('role', 'list');
  const listPanel = element('div', 'store-list-panel');
  listPanel.append(list, more);
  const mapPanel = element('div', 'store-map-panel');
  const sortCenterButton = element('button', 'store-action store-sort-center', '依地圖中心排序');
  sortCenterButton.type = 'button';
  sortCenterButton.disabled = true;
  const locateButton = element('button', 'store-action store-locate');
  locateButton.type = 'button';
  locateButton.disabled = true;
  locateButton.setAttribute('aria-label', '我的位置');
  locateButton.title = '我的位置';
  const locateIcon = element('span', 'store-locate-icon');
  locateIcon.setAttribute('aria-hidden', 'true');
  locateButton.append(locateIcon);
  const locationStatus = element('p', 'store-location-status');
  locationStatus.setAttribute('role', 'status');
  const mapElement = element('div', 'store-map');
  mapElement.setAttribute('aria-label', '店家位置');
  const mapMessage = element('p', 'store-map-status');
  mapMessage.setAttribute('role', 'status');
  mapPanel.hidden = mapElement.hidden = mapMessage.hidden = true;
  const mapLayout = element('div', 'store-map-layout is-showing-map');
  mapPanel.append(locationStatus, mapMessage, mapElement);
  mapLayout.append(listPanel);
  const storeSheet = createStoreSheet(mapLayout, mapElement, renderStoreDetails, mobile);
  mapLayout.append(mapPanel);
  root.replaceChildren(tools, feedback, retry, mapLayout);

  let stores = [];
  let matches = [];
  let listMatches = [];
  let userPosition = null;
  let userPositionNeedsUpdate = false;
  let sortPosition = null;
  let shown = 0;
  let map = null;
  let mapTask = null;
  let showingMap = true;
  let mapNeedsRefresh = true;
  let preserveMapViewOnRefresh = false;
  let locating = false;
  let firstMobileStoreSelected = false;
  const eventNav = root.closest('.stores-directory').querySelector('.store-events');
  const eventFilter = createStoreEventFilter(eventNav, root.dataset.eventId || '', () => {
    if (!search.disabled) filterStores();
  });

  function setToolsExpanded(expanded) {
    tools.classList.toggle('is-collapsed', !expanded);
    toolsToggle.setAttribute('aria-expanded', String(expanded));
    toolsToggle.textContent = expanded ? '收合工具' : '展開工具';
    storeSheet.syncMapTop();
    updateMap();
  }

  function collapseOnFirstSelection() {
    if (firstMobileStoreSelected) return;
    firstMobileStoreSelected = true;
    setToolsExpanded(false);
  }

  function updateMap() {
    if (!map || !showingMap || !mapElement.offsetWidth) return;
    if (mapNeedsRefresh) {
      map.refresh(matches, category.value, pendingStoreId, preserveMapViewOnRefresh);
      mapNeedsRefresh = false;
      preserveMapViewOnRefresh = false;
    } else {
      map.resize();
    }
    if (userPositionNeedsUpdate) {
      map.locate(userPosition);
      userPositionNeedsUpdate = false;
    }
    if (pendingStoreId) {
      const id = pendingStoreId;
      pendingStoreId = null;
      map.focusStore(id);
    }
  }

  async function showMap() {
    showingMap = true;
    listMode.setAttribute('aria-pressed', 'false');
    mapMode.setAttribute('aria-pressed', 'true');
    mapLayout.classList.add('is-showing-map');
    mapPanel.hidden = false;
    if (!mapTask) {
      mapMessage.textContent = '正在載入地圖…';
      mapMessage.hidden = false;
      const event = eventFilter.selected;
      const connectedGroups = event?.connectMarkers ? event.groups : [];
      mapTask = createStoreMap(mapElement, mapMessage, [sortCenterButton, locateButton], storeSheet, mobile, collapseOnFirstSelection, connectedGroups);
    }
    try {
      if (!map) {
        map = await mapTask;
        mapMessage.hidden = true;
      }
      if (!showingMap) return;
      mapElement.hidden = false;
      updateMap();
      sortCenterButton.disabled = false;
      locateButton.disabled = locating;
    } catch {
      mapTask = null;
      const retryMap = element('button', 'store-action', '重新載入地圖');
      retryMap.type = 'button';
      retryMap.addEventListener('click', showMap);
      mapMessage.replaceChildren('地圖暫時無法載入。 ', retryMap);
      mapMessage.hidden = false;
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      locationStatus.textContent = '此瀏覽器無法定位，請使用支援定位的瀏覽器。';
      return;
    }

    const sortPositionAtRequest = sortPosition;
    locating = locateButton.disabled = true;
    locateButton.setAttribute('aria-busy', 'true');
    locationStatus.textContent = '正在取得你的位置…';
    let finished = false;
    function finish(message = '') {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      locationStatus.textContent = message;
      locating = locateButton.disabled = false;
      locateButton.removeAttribute('aria-busy');
    }

    const watchdog = setTimeout(() => {
      finish('定位等待逾時，請確認已允許位置存取後再試。');
    }, 20000);
    try {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        if (finished) return;
        try {
          const { latitude, longitude } = coords;
          userPosition = { latitude, longitude };
          if (sortPosition === sortPositionAtRequest) sortPosition = userPosition;
          userPositionNeedsUpdate = true;
          renderList();
          updateMap();
          finish();
        } catch {
          finish('定位結果無法顯示，請再試一次。');
        }
      }, ({ code }) => {
        const messages = {
          1: '尚未允許定位，請在瀏覽器或手機設定中允許位置存取後再試。',
          2: '暫時無法取得位置，請確認手機定位服務已開啟後再試。',
          3: '定位逾時，請移到訊號較佳的位置後再試。',
        };
        finish(messages[code] || '定位失敗，請稍後再試。');
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
    } catch {
      finish('此瀏覽器無法啟動定位，請確認位置權限後再試。');
    }
  }

  function showList() {
    showingMap = false;
    map?.closeDetails();
    listMode.setAttribute('aria-pressed', 'true');
    mapMode.setAttribute('aria-pressed', 'false');
    mapPanel.hidden = true;
    mapLayout.classList.remove('is-showing-map');
  }

  function showMore() {
    const batch = listMatches.slice(shown, shown + PAGE_SIZE).map(shop =>
      renderStore(shop, openShare, openPhotos, 'li', event => {
        if (mobile.matches || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const trigger = event.currentTarget;
        if (!map?.focusStore(shop.id, trigger)) storeSheet.open(shop, undefined, undefined, trigger);
      }));

    list.append(...batch);
    shown += batch.length;
    more.hidden = shown >= matches.length;
    return batch;
  }

  function renderList() {
    listMatches = sortPosition ? map.sortByDistance(matches, sortPosition) : matches;
    list.replaceChildren();
    listPanel.scrollTop = 0;
    shown = 0;
    showMore();
  }

  function filterStores({ preserveMapView = false } = {}) {
    storeSheet.close();
    const activeFilters = Number(Boolean(city.value)) + Number(Boolean(category.value));
    filterToggle.textContent = activeFilters ? `篩選（${activeFilters}）` : '篩選';
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    matches = stores.filter(shop => (
      eventFilter.includes(shop.id)
      && (!city.value || shop.city === city.value)
      && (!category.value || shop.category === category.value)
      && terms.every(term => shop.searchText.includes(term))
    ));
    feedback.textContent = matches.length ? '' : '找不到符合條件的店家。試試其他店名、地址或篩選條件。';
    renderList();
    mapNeedsRefresh = true;
    preserveMapViewOnRefresh = preserveMapView;
    updateMap();
  }

  async function changeCategory(nextCategory, { history = true } = {}) {
    try {
      if (!await navigateCategoryPage(nextCategory, { history })) return;
      activeCategory = category.value = nextCategory;
      eventFilter.sync();
      pendingStoreId = null;
      filterStores({ preserveMapView: true });
    } catch {
      category.value = activeCategory;
      if (!history) {
        window.history.replaceState(window.history.state, '', activeCategory ? storeCategoryPath(activeCategory) : '/stores/');
      }
      feedback.textContent = '目前無法載入這個分類。請稍後重試。';
    }
  }

  async function loadStores() {
    search.disabled = city.disabled = category.disabled = listMode.disabled = mapMode.disabled = true;
    filterToggle.disabled = true;
    retry.hidden = true;
    feedback.textContent = '正在載入店家資料…';
    try {
      const response = await fetch(STORE_FEED, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`店家資料回傳 ${response.status}`);
      stores = readStores(await response.json(), location.origin).map(shop => {
        const address = normalize(shop.address);
        return {
          ...shop,
          city: storeCity(shop.address),
          searchText: `${normalize(shop.name)} ${address}`,
        };
      });
      setOptions(city, '全部縣市', stores.map(shop => shop.city));
      setOptions(category, '全部店別', stores.map(shop => shop.category));
      category.value = activeCategory;
      search.disabled = city.disabled = category.disabled = listMode.disabled = mapMode.disabled = false;
      filterToggle.disabled = false;
      filterStores();
      if (showingMap) await showMap();
    } catch {
      feedback.textContent = '目前無法載入店家資料。請稍後重試。';
      retry.hidden = false;
    }
  }

  toolsToggle.addEventListener('click', () => {
    setToolsExpanded(toolsToggle.getAttribute('aria-expanded') !== 'true');
  });
  filterToggle.addEventListener('click', () => {
    const expanded = filterToggle.getAttribute('aria-expanded') === 'true';
    filterToggle.setAttribute('aria-expanded', String(!expanded));
    storeSheet.syncMapTop();
    updateMap();
  });
  search.addEventListener('input', filterStores);
  city.addEventListener('change', filterStores);
  category.addEventListener('change', () => {
    if (eventFilter.selected) filterStores();
    else void changeCategory(category.value);
  });
  root.closest('.stores-directory').addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (!link || !link.matches('.store-category-directory a, .directory-header > .back-link') ||
        event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    const nextCategory = storeCategoryFromPath(url.pathname);
    if (url.origin !== location.origin || nextCategory === null) return;
    event.preventDefault();
    category.value = nextCategory;
    void changeCategory(nextCategory);
  });
  window.addEventListener('popstate', () => {
    const restoredCategory = storeCategoryFromPath(location.pathname);
    if (restoredCategory !== null) void changeCategory(restoredCategory, { history: false });
  });
  mobile.addEventListener('change', () => {
    storeSheet.close();
    if (!mobile.matches && !showingMap) void showMap();
  });
  window.addEventListener('hashchange', () => {
    pendingStoreId = linkedStoreId();
    if (pendingStoreId && !mapMode.disabled) void showMap();
  });
  listMode.addEventListener('click', showList);
  mapMode.addEventListener('click', showMap);
  sortCenterButton.addEventListener('click', () => {
    sortPosition = map.centerPosition();
    map.closeDetails();
    renderList();
  });
  locateButton.addEventListener('click', locateMe);
  new ResizeObserver(updateMap).observe(mapElement);
  more.addEventListener('click', () => {
    const [first] = showMore();
    first?.querySelector('a')?.focus();
  });
  retry.addEventListener('click', async () => {
    await loadStores();
    if (!retry.hidden) retry.focus();
    else if (toolsToggle.getAttribute('aria-expanded') === 'true') search.focus();
    else toolsToggle.focus();
  });

  setToolsExpanded(false);
  await loadStores();
}
