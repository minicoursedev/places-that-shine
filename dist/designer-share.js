function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(text, className) {
  const node = element('button', className, text);
  node.type = 'button';
  return node;
}

function link(text, href, className) {
  const node = element('a', className, text);
  node.href = href;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

function shareUrl(designer, work) {
  const boothPath = `/designers/${encodeURIComponent(designer.id)}/`;
  const path = work ? `${boothPath}works/${encodeURIComponent(work.id)}/` : boothPath;
  return new URL(path, location.origin);
}

export function createDesignerShare(designer) {
  const dialog = element('dialog', 'catalogue-share-dialog');
  dialog.id = 'catalogue-share-dialog';
  dialog.setAttribute('aria-labelledby', 'catalogue-share-title');
  dialog.setAttribute('aria-describedby', 'catalogue-share-description');
  let generation = 0;

  async function open(work) {
    const token = ++generation;
    const url = shareUrl(designer, work);
    const shareData = { title: work ? `${designer.name} 設計師` : designer.name, url: url.href };
    const title = element('h2', '', work ? '分享這件作品' : designer.name);
    title.id = 'catalogue-share-title';
    const close = button('×', 'catalogue-sheet-close');
    close.setAttribute('aria-label', work ? '關閉作品分享' : '關閉設計師分享');
    close.addEventListener('click', () => dialog.close());
    const header = element('header', 'catalogue-share-head');
    header.append(title, close);

    const body = element('div', 'catalogue-share-body');
    const description = element('p', '', work
      ? '分享作品連結，朋友點開就能看作品、逛攤位。'
      : '掃描 QR Code，開啟這位設計師的攤位。');
    description.id = 'catalogue-share-description';
    const qr = element('img', 'catalogue-share-qr');
    qr.alt = work ? '作品連結 QR Code' : `${designer.name}的攤位 QR Code`;
    qr.width = qr.height = work ? 192 : 220;
    qr.hidden = true;
    const qrStatus = element('p', 'catalogue-share-status');
    qrStatus.setAttribute('role', 'status');
    const publicLink = link(url.href, url.href, 'catalogue-share-url');
    const status = element('p', 'catalogue-share-status');
    status.setAttribute('role', 'status');
    const copy = button(work ? '複製作品連結' : '複製連結', 'catalogue-sheet-button catalogue-share-primary');
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url.href);
        status.textContent = work ? '已複製作品連結' : '已複製連結';
      } catch {
        status.textContent = '請長按或右鍵複製連結。';
        publicLink.focus();
      }
    });
    const actions = element('div', 'catalogue-share-actions');
    actions.append(copy);

    if (work) {
      const preview = element('div', 'catalogue-share-preview');
      if (work.images[0]) {
        const cover = element('img');
        cover.src = work.images[0].url;
        cover.alt = work.images[0].alt || work.name;
        cover.width = cover.height = 64;
        preview.append(cover);
      }
      preview.append(element('p', '', shareData.title));
      const platforms = element('div', 'catalogue-share-platforms');
      const facebook = new URL('https://www.facebook.com/sharer/sharer.php');
      facebook.searchParams.set('u', url.href);
      const threads = new URL('https://www.threads.com/intent/post');
      threads.searchParams.set('text', `${shareData.title}\n${url.href}`);
      platforms.append(
        link('分享到 Facebook', facebook.href, 'catalogue-sheet-button'),
        link('分享到 Threads', threads.href, 'catalogue-sheet-button'),
      );
      if (typeof navigator.share === 'function') {
        const nativeShare = button('更多分享方式', 'catalogue-sheet-button');
        nativeShare.addEventListener('click', async () => {
          try { await navigator.share(shareData); }
          catch (error) {
            if (error.name !== 'AbortError') status.textContent = '暫時無法開啟分享，請複製作品連結。';
          }
        });
        actions.append(nativeShare);
      }
      body.append(preview, description, platforms, actions, status, qr, qrStatus, publicLink);
    } else {
      const done = button('關閉', 'catalogue-sheet-button');
      done.addEventListener('click', () => dialog.close());
      actions.append(done);
      body.append(description, qr, qrStatus, publicLink, actions, status);
    }
    dialog.classList.toggle('catalogue-share-work', Boolean(work));
    dialog.replaceChildren(header, body);
    if (!dialog.open) dialog.showModal();
    copy.focus();

    try {
      const { qrcode } = await import('./vendor/qrcode-generator/qrcode-2.0.4.mjs');
      if (token !== generation || !dialog.open) return;
      const code = qrcode(0, 'M');
      code.addData(url.href);
      code.make();
      qr.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(code.createSvgTag({ cellSize: 4, margin: 16, scalable: true }))}`;
      qr.hidden = false;
    } catch {
      if (token === generation && dialog.open) qrStatus.textContent = '暫時無法產生 QR Code。仍可複製連結。';
    }
  }

  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => { generation++; });

  return {
    dialog,
    trigger(work) {
      const label = work ? '分享作品' : '分享設計師';
      const trigger = button(label, 'catalogue-sheet-button');
      trigger.setAttribute('aria-label', `${label}：${work?.name || designer.name}`);
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', dialog.id);
      trigger.addEventListener('click', () => open(work));
      return trigger;
    },
  };
}
