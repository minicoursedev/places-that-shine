// Delegation covers both server-rendered pages and dynamically opened booths.
for (const dialog of document.querySelectorAll('[data-share-kind]')) {
  const { shareKind } = dialog.dataset;
  const isWork = shareKind === 'work';
  const attribute = `data-share-${shareKind}`;
  const part = name => document.getElementById(`${shareKind}-share-${name}`);
  let generation = 0;
  let shareData = null;
  document.addEventListener('click', async event => {
    const button = event.target.closest?.(`[${attribute}]`);
    if (!button) return;
    const url = new URL(button.getAttribute(attribute), location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/designers/')) return;
    const token = ++generation;
    const name = isWork ? button.dataset.workDesigner : button.closest('dialog, article').querySelector('h1, h2').textContent;
    shareData = { title: `${name} 設計師`, url: url.href };
    const facebook = new URL('https://www.facebook.com/sharer/sharer.php');
    facebook.searchParams.set('u', url.href);
    part('facebook').href = facebook.href;
    const threads = new URL('https://www.threads.com/intent/post');
    threads.searchParams.set('text', `${shareData.title}\n${url.href}`);
    part('threads').href = threads.href;
    part('designer').textContent = shareData.title;
    if (isWork) {
      const image = part('image');
      image.src = button.dataset.workImage;
      image.alt = button.dataset.workLabel || '';
      image.hidden = !button.dataset.workImage;
    }
    const link = part('url');
    link.href = url.href;
    link.textContent = url.href;
    part('status').textContent = '';
    part('qr-status').textContent = '';
    part('qr').hidden = true;
    part('native').hidden = typeof navigator.share !== 'function';
    if (!dialog.open) dialog.showModal();
    part('copy').focus();
    try {
      const { qrcode } = await import('../../vendor/qrcode-generator/qrcode-2.0.4.mjs');
      if (token !== generation || !dialog.open) return;
      const qr = qrcode(0, 'M');
      qr.addData(url.href);
      qr.make();
      part('qr').src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true }));
      part('qr').hidden = false;
    } catch {
      if (token === generation && dialog.open) part('qr-status').textContent = 'QRCode 暫時無法產生，仍可複製下方連結。';
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest?.('.dlg-close')) dialog.close();
  });
  dialog.addEventListener('close', () => { generation++; });
  part('copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      part('status').textContent = isWork ? '已複製作品連結' : '已複製連結';
    } catch {
      part('status').textContent = '請長按或右鍵上方網址複製連結。';
    }
  });
  part('native').addEventListener('click', async () => {
    try { await navigator.share(shareData); }
    catch (error) {
      if (error.name !== 'AbortError') part('status').textContent = '暫時無法開啟分享，請複製作品連結。';
    }
  });
}
