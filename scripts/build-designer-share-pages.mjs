import { mkdir, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const output = join(dist, 'designers');
const origin = 'https://places-that-shine.lmanliang.chatgpt.site';
const site = '發光的地方';
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pageMarker = 'name="designer-share-route"';

const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => escapes[character]);
const text = value => typeof value === 'string' ? value.trim() : '';
const active = value => Array.isArray(value) ? value.filter(item => item && item.disabled !== true) : [];

function claimId(entry, seen) {
  if (typeof entry.id !== 'string' || !idPattern.test(entry.id) || seen.has(entry.id)) {
    throw new Error(`Invalid or duplicate share ID: ${entry.id}`);
  }
  seen.add(entry.id);
}

function imageUrl(value) {
  if (!text(value)) return null;
  const url = new URL(value, origin);
  return url.origin === origin && url.pathname.startsWith('/media/') ? url.href : null;
}

function workPreview(work) {
  for (const image of active(work.images)) {
    const url = imageUrl(typeof image === 'string' ? image : image.url);
    if (url) return { url, alt: text(image.alt) || work.title };
  }
  return null;
}

function logoPreview(designer) {
  const url = imageUrl(typeof designer.logo === 'string' ? designer.logo : designer.logo?.url);
  return url ? { url, alt: `${designer.name}的攤位標誌` } : null;
}

function describe(value, fallback) {
  const content = text(value).replace(/\s+/gu, ' ') || fallback;
  const characters = [...content];
  return characters.length > 180 ? characters.slice(0, 179).join('') + '…' : content;
}

function sharePages(designers) {
  const pages = [];
  const designerIds = new Set();
  const defaultPreview = { url: imageUrl('/media/designer.webp'), alt: '發光的設計師' };
  for (const designer of active(designers)) {
    claimId(designer, designerIds);
    const name = text(designer.name);
    if (!name) continue;

    const root = `designers/${designer.id}`;
    const works = active(designer.works).filter(work => text(work.title));
    const preview = logoPreview(designer) || works.map(workPreview).find(Boolean) || defaultPreview;
    pages.push({
      path: root,
      route: root,
      title: `${name}｜${site}`,
      description: describe(designer.description || designer.bio, `到「${site}」逛${name}的攤位，看看設計師的作品。`),
      preview,
    });

    const workIds = new Set();
    for (const work of works) {
      claimId(work, workIds);
      const title = text(work.title);
      const attribution = title.includes(name) ? title : `${title}｜${name}`;
      pages.push({
        path: `${root}/works/${work.id}`,
        route: `${root}/${work.id}`,
        title: `${attribution}｜${site}`,
        description: describe(work.description, `在「${site}」看${name}的作品《${title}》。`),
        preview: workPreview(work) || preview,
      });
    }
  }
  return pages;
}

function buildPage(shell, page) {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = escapeHtml(new URL(`/${page.path}/`, origin).href);
  const image = escapeHtml(page.preview.url);
  const imageAlt = escapeHtml(page.preview.alt);
  const meta = [
    '  <base href="/">',
    `  <title>${title}</title>`,
    `  <meta name="description" content="${description}">`,
    `  <meta ${pageMarker} content="${escapeHtml(page.route)}">`,
    `  <link rel="canonical" href="${url}">`,
    '  <meta property="og:type" content="website">',
    '  <meta property="og:locale" content="zh_TW">',
    `  <meta property="og:site_name" content="${site}">`,
    `  <meta property="og:title" content="${title}">`,
    `  <meta property="og:description" content="${description}">`,
    `  <meta property="og:url" content="${url}">`,
    `  <meta property="og:image" content="${image}">`,
    `  <meta property="og:image:alt" content="${imageAlt}">`,
    '  <meta name="twitter:card" content="summary_large_image">',
  ].join('\n');
  return shell
    .replace(/^\s*<meta name="description"[^>]*>\r?\n/m, '')
    .replace(/^\s*<title>[^<]*<\/title>/m, () => meta);
}

// Remove retired generated routes without deleting unrelated files.
async function removeStalePages(directory, expected) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await removeStalePages(file, expected);
      if ((await readdir(file)).length === 0) await rmdir(file);
    } else if (entry.name === 'index.html' && entry.isFile() && !expected.has(file)) {
      const previous = await readFile(file, 'utf8');
      if (previous.includes(pageMarker)) await unlink(file);
    }
  }
}

const [shell, catalogue] = await Promise.all([
  readFile(join(dist, 'index.html'), 'utf8'),
  readFile(join(dist, 'data', 'designers.json'), 'utf8'),
]);
if (!/^\s*<title>[^<]*<\/title>/m.test(shell)) throw new Error('Missing title in the site shell');
const { designers } = JSON.parse(catalogue);
if (!Array.isArray(designers)) throw new Error('Missing designer catalogue');

const pages = sharePages(designers);
if (!pages.length) throw new Error('No designer share pages were produced');
const expected = new Set();
for (const page of pages) {
  const directory = join(dist, page.path);
  const file = join(directory, 'index.html');
  await mkdir(directory, { recursive: true });
  await writeFile(file, buildPage(shell, page));
  expected.add(file);
}
await removeStalePages(output, expected);
console.log(`Generated ${pages.length} designer and work share pages.`);
