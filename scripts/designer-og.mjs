import { readFile, writeFile, mkdir, realpath, rename } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import sharp from 'sharp';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const TEXT_LEFT = 508;
const TEXT_WIDTH = 668;
const LOGO_SIZE = 470;
const MANIFEST = 'designers/og-images.json';
const CATALOGUE = 'data/oshen-designers.json';
const SHARED_BLUEBIRD_LOGO = '/media/bluebird-action-2024-logo.webp';
const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const plainText = value => typeof value === 'string' ? value.trim().replace(/\r\n?/g, '\n') : '';

async function prepareFonts(fontDirectory) {
  // Use bundled fonts and a writable, build-only cache on both macOS and Linux.
  const sources = await readFile(resolve(fontDirectory, 'sources.json'));
  const version = createHash('sha256').update(fontDirectory).update(sources).digest('hex').slice(0, 16);
  const cache = resolve(tmpdir(), `oshen-og-fonts-${version}`);
  await mkdir(cache, { recursive: true });
  const config = resolve(cache, 'fonts.conf');
  const temporaryConfig = `${config}.${randomUUID()}`;
  await writeFile(temporaryConfig, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${escape(fontDirectory)}</dir><cachedir>${escape(cache)}</cachedir></fontconfig>`);
  await rename(temporaryConfig, config);
  process.env.FONTCONFIG_FILE = config;
}

async function textImage(text, fontDirectory, { bold = false, size, maxHeight }) {
  const options = {
    text: `<span foreground="${bold ? '#24302d' : '#343b37'}">${escape(text)}</span>`,
    font: `Noto Sans TC${bold ? ' Bold' : ''} ${size}`,
    fontfile: resolve(fontDirectory, bold ? 'NotoSansTC-Bold.otf' : 'NotoSansTC-Regular.otf'),
    width: TEXT_WIDTH, rgba: true, wrap: 'word-char', spacing: 0,
  };
  let result = await sharp({ text: options }).png().toBuffer({ resolveWithObject: true });
  if (result.info.height > maxHeight) {
    result = await sharp({ text: { ...options, height: maxHeight } }).png().toBuffer({ resolveWithObject: true });
  }
  return result;
}

async function biographyLines(description, fontDirectory) {
  // Preserve verse line breaks. Prose can reflow at its existing punctuation;
  // only whitespace changes, never the author's words.
  if (!/[，。；！？]/u.test(description)) return description;
  const widths = new Map();
  async function fits(text) {
    // Direction marks alone have no visible width and cannot be rasterized by Pango.
    if (!/[^\p{Cf}\s]/u.test(text)) return true;
    if (!widths.has(text)) {
      const result = await sharp({ text: {
        text: escape(text), font: 'Noto Sans TC 40',
        fontfile: resolve(fontDirectory, 'NotoSansTC-Regular.otf'), rgba: true,
      } }).png().toBuffer({ resolveWithObject: true });
      widths.set(text, result.info.width);
    }
    return widths.get(text) <= TEXT_WIDTH;
  }
  const lines = [];
  let line = '';
  for (const clause of description.split(/(?<=[，。；！？])|\n/u).map(clause => clause.trim()).filter(Boolean)) {
    if (line && !await fits(line + clause)) { lines.push(line); line = ''; }
    if (await fits(clause)) line += clause;
    else {
      for (const { segment } of new Intl.Segmenter('zh-TW', { granularity: 'grapheme' }).segment(clause)) {
        if (line && !await fits(line + segment)) { lines.push(line); line = ''; }
        line += segment;
      }
    }
    if (/[。！？]$/u.test(clause)) { lines.push(line); line = ''; }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

async function readBundledSource(source, publicDirectory, site, designerId) {
  if (!source) return null;
  const url = new URL(source, new URL(CATALOGUE, site));
  if (url.origin !== new URL(site).origin) return null;
  const relativePath = decodeURIComponent(url.pathname);
  const allowedDirectory = resolve(publicDirectory, 'media/library', designerId);
  const file = resolve(publicDirectory, '.' + relativePath);
  if (!(file.startsWith(allowedDirectory + sep) || relativePath === SHARED_BLUEBIRD_LOGO)) return null;
  try {
    if (await realpath(file) !== file) return null;
    return await readFile(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function designerImage(designer, publicDirectory, site) {
  if (designer.logo?.status === 'verified') {
    const input = await readBundledSource(designer.logo.url, publicDirectory, site, designer.id);
    if (input) return { input, label: 'Logo' };
  }
  for (const work of designer.productImages ?? []) {
    if (work.disabled === true) continue;
    const input = await readBundledSource(work.url, publicDirectory, site, designer.id);
    if (input) return { input, label: '作品圖片' };
  }
  return null;
}

async function renderCard(designer, input, fontDirectory) {
  const name = plainText(designer.name);
  const description = plainText(designer.description);
  const overlay = await sharp(input).rotate().resize({
    width: LOGO_SIZE, height: LOGO_SIZE, fit: 'inside',
  }).png().toBuffer({ resolveWithObject: true });
  const left = 20 + Math.floor((LOGO_SIZE - overlay.info.width) / 2);
  const top = Math.floor((OG_HEIGHT - overlay.info.height) / 2);
  const title = await textImage(name.replace(/。(?!$)/g, '。\n'), fontDirectory, { bold: true, size: 60, maxHeight: 164 });
  const titleTop = 64;
  const descriptionTop = titleTop + title.info.height + 56;
  const formattedDescription = description ? await biographyLines(description, fontDirectory) : '';
  const biography = formattedDescription ? await textImage(formattedDescription, fontDirectory, {
    size: 40, maxHeight: OG_HEIGHT - descriptionTop - 64,
  }) : null;
  const layers = [
    { input: overlay.data, left, top },
    { input: title.data, left: TEXT_LEFT, top: titleTop },
    ...(biography ? [{ input: biography.data, left: TEXT_LEFT, top: descriptionTop }] : []),
  ];
  return sharp({ create: {
    width: OG_WIDTH, height: OG_HEIGHT, channels: 3, background: '#ffffff',
  } }).composite(layers).webp({ quality: 90, effort: 6, smartSubsample: true }).toBuffer();
}

export async function generateDesignerOg({ root, site, directory, urlPrefix = '/designers/assets/og/' }) {
  const publicDirectory = await realpath(resolve(root, 'public'));
  const fontDirectory = resolve(root, 'scripts/fonts');
  const { designers } = JSON.parse(await readFile(resolve(publicDirectory, CATALOGUE), 'utf8'));
  const fallback = JSON.parse(await readFile(resolve(publicDirectory, MANIFEST), 'utf8'));
  const outputDirectory = resolve(directory, 'designers/assets/og');
  await prepareFonts(fontDirectory);
  await mkdir(outputDirectory, { recursive: true });
  const index = {};
  // Limit simultaneous Sharp jobs while rendering the complete catalogue.
  const active = designers.filter(designer => designer.disabled !== true);
  for (let start = 0; start < active.length; start += 8) {
    const entries = await Promise.all(active.slice(start, start + 8).map(async designer => {
      const { id } = designer;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Invalid designer OG id');
      const image = await designerImage(designer, publicDirectory, site);
      if (!image) return [id, fallback[id]];
      const buffer = await renderCard(designer, image.input, fontDirectory);
      const version = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
      await writeFile(resolve(outputDirectory, `${id}.webp`), buffer);
      return [id, {
        url: `${urlPrefix}${id}.webp?v=${version}`, width: OG_WIDTH, height: OG_HEIGHT, type: 'image/webp',
        alt: `${plainText(designer.name)}｜${image.label}、名字${plainText(designer.description) ? '與簡介' : ''}`,
      }];
    }));
    for (const [id, entry] of entries) {
      if (entry) index[id] = entry;
    }
  }
  const manifest = resolve(directory, MANIFEST);
  await mkdir(dirname(manifest), { recursive: true });
  await writeFile(manifest, JSON.stringify(index) + '\n');
  return index;
}
