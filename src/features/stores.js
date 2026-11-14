const STORE_FEED = '/data/stores.json';
const PAGE_SIZE = 12;
const CITY_PREFIX = /^(?:\d{3}(?:-?\d{2,3})?\s*)?([\p{Script=Han}]{2}[縣市])/u;
const MAP_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TAIWAN_BOUNDS = [[21.88, 117.97], [26.42, 122.05]];
const SOCIALS = [
  ['instagram', 'Instagram'],
  ['facebook', 'Facebook'],
  ['threads', 'Threads'],
];
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

function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
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

function renderStore({ name, address, category, serviceType, shopPhoto, social, openingHours, visitNote, productImages }, tag = 'li') {
  const card = element(tag, 'store-card');
  const summary = element('div', 'store-summary');
  const text = element('div', 'store-text');
  const type = category === '洋流服務站' && serviceType
    ? `${category}・${serviceType}`
    : category;
  text.append(element('p', 'store-category', type), element('h3', 'store-name', name));
  text.append(element('p', 'store-address', address));
  summary.append(text);

  const photo = shopPhoto?.status === 'verified' && localPhotoUrl(shopPhoto.url);
  if (photo) {
    const img = element('img', 'store-photo');
    img.alt = '';
    img.width = 54;
    img.height = 54;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = photo.href;
    summary.append(img);
  }

  const links = element('div', 'store-links');
  const directions = new URL('https://www.google.com/maps/dir/');
  directions.searchParams.set('api', '1');
  directions.searchParams.set('destination', `${address} ${name}`);
  links.append(externalLink('導航', directions, name));
  for (const [field, label] of SOCIALS) {
    const url = safeUrl(social?.[field]);
    if (url) links.append(externalLink(label, url, name));
  }

  card.append(summary);
  const hours = openingHours?.text;
  const hasHours = typeof hours === 'string' && hours.trim()
    && ['verified', 'reference', 'appointment'].includes(openingHours.status);
  const photos = element('div', 'store-gallery');
  for (const product of Array.isArray(productImages) ? productImages : []) {
    const url = localPhotoUrl(product?.url);
    if (!url) continue;
    const image = element('img', 'store-gallery-image');
    image.alt = product.alt || `${name}的店家照片`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = url.href;
    photos.append(image);
  }
  if (hasHours || visitNote || photos.childElementCount) {
    const details = element('details', 'store-details');
    details.append(element('summary', '', '到訪資訊'));
    if (hasHours) {
      const heading = openingHours.status === 'reference' ? '營業時間（參考）' : '營業時間與預約';
      details.append(element('strong', '', heading), element('p', 'store-hours', hours));
      if (openingHours.note) details.append(element('p', 'store-visit-note', openingHours.note));
    }
    if (visitNote) details.append(element('p', 'store-visit-note', visitNote));
    if (photos.childElementCount) details.append(photos);
    card.append(details);
  }
  card.append(links);
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

async function createStoreMap(container, message) {
  await Promise.all([
    loadAsset('link', '/vendor/leaflet/leaflet.css'),
    loadAsset('link', '/vendor/leaflet-markercluster/MarkerCluster.css'),
    loadAsset('script', '/vendor/leaflet/leaflet.js'),
  ]);
  await loadAsset('script', '/vendor/leaflet-markercluster/leaflet.markercluster.js');
  const L = globalThis.L;
  const map = L.map(container, { scrollWheelZoom: false, maxZoom: 19 });
  map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-in').setAttribute('aria-label', '放大地圖');
  map.zoomControl.getContainer().querySelector('.leaflet-control-zoom-out').setAttribute('aria-label', '縮小地圖');

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

  const markers = L.markerClusterGroup({
    maxClusterRadius: 48,
    showCoverageOnHover: false,
    iconCreateFunction(cluster) {
      return L.divIcon({
        className: 'store-cluster',
        html: String(cluster.getChildCount()),
        iconSize: [40, 40],
      });
    },
  }).addTo(map);

  return {
    resize() {
      map.invalidateSize({ pan: false });
    },
    refresh(stores) {
      map.invalidateSize({ pan: false });
      markers.clearLayers();
      const pins = [];
      for (const shop of stores) {
        const { lat, lng } = shop.latlng || {};
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
        const marker = L.marker([lat, lng], { title: shop.name, alt: shop.name });
        marker.bindPopup(() => renderStore(shop, 'article'), { maxWidth: 290, maxHeight: 350 });
        pins.push(marker);
      }
      markers.addLayers(pins);
      const bounds = pins.length ? markers.getBounds() : TAIWAN_BOUNDS;
      map.fitBounds(bounds, { animate: false, padding: [28, 28], maxZoom: 15 });
      return pins.length;
    },
  };
}

export async function mountStores(root) {
  const controls = element('div', 'store-controls');
  const search = element('input', 'store-input');
  search.type = 'search';
  search.placeholder = '輸入店名或地址';
  search.autocomplete = 'off';
  const city = element('select', 'store-input');
  const category = element('select', 'store-input');
  setOptions(city, '全部縣市', []);
  setOptions(category, '全部店別', []);
  controls.append(labelField('搜尋', search), labelField('縣市', city), labelField('店別', category));

  const status = element('p', 'store-status');
  status.setAttribute('role', 'status');
  const modes = element('div', 'store-modes');
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', '店家瀏覽方式');
  const listMode = element('button', 'store-action', '店家清單');
  const mapMode = element('button', 'store-action', '店家地圖');
  listMode.type = mapMode.type = 'button';
  listMode.setAttribute('aria-pressed', 'true');
  mapMode.setAttribute('aria-pressed', 'false');
  modes.append(listMode, mapMode);
  const retry = element('button', 'store-action', '重新載入');
  const more = element('button', 'store-action store-more', '顯示更多店家');
  retry.type = more.type = 'button';
  retry.hidden = more.hidden = true;
  const list = element('ul', 'store-results');
  list.setAttribute('role', 'list');
  const mapPanel = element('div', 'store-map-panel');
  const mapElement = element('div', 'store-map');
  mapElement.setAttribute('aria-label', '店家位置');
  const mapMessage = element('p', 'store-map-status');
  mapMessage.setAttribute('role', 'status');
  mapPanel.hidden = mapElement.hidden = mapMessage.hidden = true;
  mapPanel.append(mapMessage, mapElement);
  root.replaceChildren(controls, modes, status, retry, list, more, mapPanel);

  let stores = [];
  let matches = [];
  let shown = 0;
  let map = null;
  let mapTask = null;
  let showingMap = false;
  let mapNeedsRefresh = true;

  function updateStatus() {
    if (!matches.length) {
      status.textContent = '找不到符合條件的店家。試試其他店名、地址或篩選條件。';
      return;
    }
    status.textContent = showingMap
      ? `共 ${matches.length} 家`
      : `共 ${matches.length} 家，已顯示 ${shown} 家`;
  }

  function updateMap() {
    if (!map || !showingMap || !mapElement.offsetWidth) return;
    if (!mapNeedsRefresh) {
      map.resize();
      return;
    }
    const located = map.refresh(matches);
    mapNeedsRefresh = false;
    if (located < matches.length) {
      status.textContent = `共 ${matches.length} 家，其中 ${located} 家可在地圖查看。`;
    }
  }

  async function showMap() {
    showingMap = true;
    listMode.setAttribute('aria-pressed', 'false');
    mapMode.setAttribute('aria-pressed', 'true');
    list.hidden = more.hidden = true;
    mapPanel.hidden = false;
    updateStatus();
    if (!mapTask) {
      mapMessage.textContent = '正在載入地圖…';
      mapMessage.hidden = false;
      mapTask = createStoreMap(mapElement, mapMessage);
    }
    try {
      if (!map) {
        map = await mapTask;
        mapMessage.hidden = true;
      }
      if (!showingMap) return;
      mapElement.hidden = false;
      updateMap();
    } catch {
      mapTask = null;
      mapMessage.textContent = '地圖暫時無法載入。可再選一次「店家地圖」重試，或切換回清單。';
      mapMessage.hidden = false;
    }
  }

  function showList() {
    showingMap = false;
    listMode.setAttribute('aria-pressed', 'true');
    mapMode.setAttribute('aria-pressed', 'false');
    mapPanel.hidden = true;
    list.hidden = false;
    more.hidden = shown >= matches.length;
    updateStatus();
  }

  function showMore() {
    const batch = matches.slice(shown, shown + PAGE_SIZE).map(shop => renderStore(shop));
    list.append(...batch);
    shown += batch.length;
    updateStatus();
    more.hidden = showingMap || shown >= matches.length;
    return batch;
  }

  function filterStores() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    matches = stores.filter(shop => (
      (!city.value || shop.city === city.value)
      && (!category.value || shop.category === category.value)
      && terms.every(term => shop.searchText.includes(term))
    ));
    list.replaceChildren();
    shown = 0;
    showMore();
    mapNeedsRefresh = true;
    updateMap();
  }

  async function loadStores() {
    search.disabled = city.disabled = category.disabled = listMode.disabled = mapMode.disabled = true;
    retry.hidden = true;
    status.textContent = '正在載入店家資料…';
    try {
      const response = await fetch(STORE_FEED);
      if (!response.ok) throw new Error(`店家資料回傳 ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data?.stores)) throw new Error('店家資料格式不正確');
      stores = data.stores.filter(shop => (
        shop?.disabled !== true
        && ['name', 'address', 'category'].every(key => typeof shop?.[key] === 'string' && shop[key].trim())
      )).map(shop => {
        const address = normalize(shop.address);
        return {
          ...shop,
          city: address.match(CITY_PREFIX)?.[1] || '',
          searchText: `${normalize(shop.name)} ${address}`,
        };
      });
      setOptions(city, '全部縣市', stores.map(shop => shop.city));
      setOptions(category, '全部店別', stores.map(shop => shop.category));
      search.disabled = city.disabled = category.disabled = listMode.disabled = mapMode.disabled = false;
      filterStores();
    } catch {
      status.textContent = '目前無法載入店家資料。請稍後重試。';
      retry.hidden = false;
    }
  }

  search.addEventListener('input', filterStores);
  city.addEventListener('change', filterStores);
  category.addEventListener('change', filterStores);
  listMode.addEventListener('click', showList);
  mapMode.addEventListener('click', showMap);
  new ResizeObserver(updateMap).observe(mapElement);
  more.addEventListener('click', () => {
    const [first] = showMore();
    first?.querySelector('a')?.focus();
  });
  retry.addEventListener('click', async () => {
    await loadStores();
    if (retry.hidden) search.focus();
    else retry.focus();
  });

  await loadStores();
}
