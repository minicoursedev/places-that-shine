const STORE_FEED = 'https://minicourse.dev/puma_oshen_wave/stores.json';
const PAGE_SIZE = 12;
const CITY_PREFIX = /^(?:\d{3}(?:-?\d{2,3})?\s*)?([\p{Script=Han}]{2}[縣市])/u;
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

function externalLink(label, url, name) {
  const link = element('a', 'store-link', `${label} ↗`);
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${name}的${label}（在新分頁開啟）`);
  return link;
}

function renderStore({ name, address, category, serviceType, shopPhoto, social }) {
  const card = element('li', 'store-card');
  const summary = element('div', 'store-summary');
  const text = element('div', 'store-text');
  const type = category === '洋流服務站' && serviceType
    ? `${category}・${serviceType}`
    : category;
  text.append(element('p', 'store-category', type), element('h3', 'store-name', name));
  text.append(element('p', 'store-address', address));
  summary.append(text);

  const photo = shopPhoto?.status === 'verified' && safeUrl(shopPhoto.url);
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

  card.append(summary, links);
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
  const retry = element('button', 'store-action', '重新載入');
  const more = element('button', 'store-action store-more', '顯示更多店家');
  retry.type = more.type = 'button';
  retry.hidden = more.hidden = true;
  const list = element('ul', 'store-results');
  list.setAttribute('role', 'list');
  root.replaceChildren(controls, status, retry, list, more);

  let stores = [];
  let matches = [];
  let shown = 0;

  function showMore() {
    const batch = matches.slice(shown, shown + PAGE_SIZE).map(renderStore);
    list.append(...batch);
    shown += batch.length;
    status.textContent = matches.length
      ? `共 ${matches.length} 家，已顯示 ${shown} 家`
      : '找不到符合條件的店家。試試其他店名、地址或篩選條件。';
    more.hidden = shown >= matches.length;
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
  }

  async function loadStores() {
    search.disabled = city.disabled = category.disabled = true;
    retry.hidden = true;
    status.textContent = '正在載入店家資料…';
    try {
      const response = await fetch(STORE_FEED, { cache: 'no-cache', credentials: 'omit' });
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
      search.disabled = city.disabled = category.disabled = false;
      filterStores();
    } catch {
      status.textContent = '目前無法載入洋流店家。請稍後重試。';
      retry.hidden = false;
    }
  }

  search.addEventListener('input', filterStores);
  city.addEventListener('change', filterStores);
  category.addEventListener('change', filterStores);
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
