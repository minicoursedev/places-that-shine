let previewsRequest;
let previousWork = -1;

function loadPreviews() {
  previewsRequest ??= fetch('/data/store-work-previews.json', { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error(`Could not load store work previews: HTTP ${response.status}`);
      return response.json();
    })
    .catch(() => {
      previewsRequest = undefined;
      return [];
    });
  return previewsRequest;
}

export async function appendStoreWorkPreview(parent) {
  const previews = await loadPreviews();
  if (!parent.isConnected || !previews.length) return;

  const avoidRepeat = previousWork >= 0 && previews.length > 1;
  const index = Math.floor(Math.random() * (previews.length - Number(avoidRepeat)));
  previousWork = avoidRepeat && index >= previousWork ? index + 1 : index;
  const work = previews[previousWork];

  const section = document.createElement('section');
  section.className = 'store-work-feature';
  section.setAttribute('aria-label', '設計師作品');
  const divider = document.createElement('div');
  divider.className = 'store-work-preview-divider';
  divider.setAttribute('aria-hidden', 'true');
  divider.textContent = '✦';

  const link = document.createElement('a');
  link.className = 'store-work-preview-link';
  link.href = work.href;
  link.target = '_blank';
  link.rel = 'noopener';
  link.setAttribute('aria-label', `查看${work.designerName}的作品「${work.label}」（在新分頁開啟）`);
  const cover = document.createElement('span');
  cover.className = 'store-work-preview-cover';
  const image = document.createElement('img');
  image.alt = work.label;
  if (work.width && work.height) {
    image.width = work.width;
    image.height = work.height;
  }
  image.loading = 'lazy';
  image.decoding = 'async';
  image.src = work.image;
  const designer = document.createElement('span');
  designer.className = 'store-work-preview-designer';
  designer.textContent = work.designerName;
  cover.append(image, designer);
  link.append(cover);
  section.append(divider, link);
  parent.append(section);
}
