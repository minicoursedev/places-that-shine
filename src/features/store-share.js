import { storePath } from '../lib/oshen-store-links.mjs';

const QR_GENERATOR = '/vendor/qrcode-generator/qrcode-2.0.4.mjs';

export function createStoreShare(dialog) {
  const shopName = dialog.querySelector('#store-share-name');
  const image = dialog.querySelector('#store-share-qr');
  const qrStatus = dialog.querySelector('#store-share-qr-status');
  const link = dialog.querySelector('#store-share-url');
  const copy = dialog.querySelector('#store-share-copy');
  const status = dialog.querySelector('#store-share-status');
  let generation = 0;

  copy.addEventListener('click', async () => {
    const current = generation;
    let message = '已複製店家連結';
    try {
      await navigator.clipboard.writeText(link.href);
    } catch {
      message = '請長按或右鍵上方網址複製連結。';
    }
    if (dialog.open && current === generation) status.textContent = message;
  });

  return async ({ id, name }) => {
    const current = ++generation;
    const url = new URL(storePath(id), location.origin);
    shopName.textContent = name;
    link.href = link.textContent = url.href;
    status.textContent = qrStatus.textContent = '';
    image.hidden = true;
    if (!dialog.open) dialog.showModal();

    try {
      const { qrcode } = await import(/* @vite-ignore */ QR_GENERATOR);
      if (!dialog.open || current !== generation) return;
      const qr = qrcode(0, 'M');
      qr.addData(url.href);
      qr.make();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true }))}`;
      image.hidden = false;
    } catch {
      if (dialog.open && current === generation) qrStatus.textContent = '暫時無法產生 QR Code，仍可複製店家連結。';
    }
  };
}
