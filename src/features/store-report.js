const photoLimit = 1_000_000;

async function compressPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.65, 0.45]) {
      const photo = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (photo && photo.size <= photoLimit) return photo;
    }
    throw new Error('Photo too large');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function mountStoreReport(form) {
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[role="status"]');
  const photoChoice = form.querySelector('[value="photo"]');
  let widget;
  let verified = false;
  let sending = false;
  const updateButton = () => { button.disabled = sending || !verified; };
  const updateFields = () => {
    const kind = form.elements.kind.value;
    for (const field of form.querySelectorAll('[data-field]')) {
      const name = field.dataset.field;
      const hide = name === 'name' ? kind === 'url' : name !== kind;
      field.hidden = hide;
      const input = field.querySelector('input');
      input.disabled = hide;
      input.required = !hide;
    }
  };
  form.addEventListener('change', updateFields);
  updateFields();

  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.addEventListener('load', () => {
    widget = window.turnstile.render(form.querySelector('[data-turnstile]'), {
      sitekey: form.dataset.sitekey,
      action: 'store_report',
      callback: () => { verified = true; updateButton(); },
      'expired-callback': () => { verified = false; updateButton(); },
      'error-callback': () => {
        verified = false;
        updateButton();
        status.textContent = '驗證載入失敗，請重新整理頁面再試。';
      },
    });
  });
  script.addEventListener('error', () => {
    status.textContent = '驗證載入失敗，請重新整理頁面再試。';
  });
  document.head.append(script);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !verified) return;
    sending = true;
    updateButton();
    status.textContent = '正在送出…';
    const data = new FormData(form);
    try {
      if (data.has('photo')) {
        try {
          data.set('photo', await compressPhoto(data.get('photo')), 'store.jpg');
        } catch {
          status.textContent = '無法處理這張照片，請改選較小的照片。';
          return;
        }
      }
      const response = await fetch(form.action, { method: 'POST', body: data });
      const result = await response.json().catch(() => ({}));
      if (response.status === 201 && result.ok === true) {
        form.reset();
        updateFields();
        status.textContent = '已收到推薦，謝謝你。';
      } else if (result.error === 'photo_quota') {
        photoChoice.disabled = true;
        form.querySelector('[value="url"]').checked = true;
        updateFields();
        status.textContent = '照片上傳目前已達額度，請改送店家連結或店名＋地址。';
      } else if (response.status === 429) {
        status.textContent = '送出次數過多，請稍後再試。';
      } else {
        status.textContent = result.message || '推薦送出失敗，請稍後再試。';
      }
    } catch {
      status.textContent = '連線失敗，請稍後再試。';
    } finally {
      sending = false;
      verified = false;
      updateButton();
      window.turnstile.reset(widget);
    }
  });
}
