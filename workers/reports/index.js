const MAX_PHOTO_BYTES = 1_000_000;
const MAX_FORM_BYTES = MAX_PHOTO_BYTES + 16_384;
const REVIEWED = ['accepted', 'dismissed'];
const PAGE_SIZE = 24;
const SERVER_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const TAIPEI_DATE = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', dateStyle: 'short' });
const REPORT_ID = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
const LIST_PATH = /^\/api\/reports\/([^/]+)\/?$/;
const PHOTO_PATH = new RegExp('^/api/reports/(' + REPORT_ID + ')/photo/?$');
const VALID_REPORT_ID = new RegExp('^' + REPORT_ID + '$');
const ENCODER = new TextEncoder();

class InputError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: SERVER_HEADERS });
}

function unauthorized() {
  return Response.json({ error: 'unauthorized' }, {
    status: 401,
    headers: { ...SERVER_HEADERS, 'WWW-Authenticate': 'Bearer realm="store-reports"' },
  });
}

async function hasAdminToken(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  if (authorization.length > 520) return false;
  const match = /^Bearer +([A-Za-z0-9._~+/-]+=*)$/i.exec(authorization);
  if (!match) return false;
  const expected = env.REPORTS_ADMIN_TOKEN_SHA256;
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
    throw new Error('Missing or invalid reports admin token digest');
  }
  const expectedDigest = Uint8Array.from(expected.match(/../g), byte => Number.parseInt(byte, 16));
  const receivedDigest = await crypto.subtle.digest('SHA-256', ENCODER.encode(match[1]));
  return crypto.subtle.timingSafeEqual(receivedDigest, expectedDigest);
}

function badInput(message = '請確認推薦資料是否完整。') {
  return new InputError(400, 'invalid_input', message);
}

async function readBody(request, maxBytes) {
  const size = request.headers.get('Content-Length');
  if ((size !== null && Number(size) > maxBytes) || !request.body) {
    throw new InputError(413, 'too_large', '上傳資料大小超過限制。');
  }
  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new InputError(413, 'too_large', '上傳資料大小超過限制。');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks);
}

function sameOrigin(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    throw new InputError(403, 'forbidden', '無法確認送出來源，請從網站重新開啟表單。');
  }
}

function textField(form, field, maxLength) {
  const values = form.getAll(field);
  const value = values[0];
  if (values.length !== 1 || typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw badInput();
  }
  return value.trim();
}

function storeUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw badInput('請貼上有效的店家連結。'); }
  const host = url.hostname.replace(/^www\./, '');
  const social = ['instagram.com', 'facebook.com', 'm.facebook.com', 'fb.com', 'fb.me',
    'threads.net', 'threads.com', 'x.com', 'twitter.com', 'tiktok.com', 'vt.tiktok.com'];
  const maps = (host === 'google.com' || host === 'google.com.tw')
    && /^\/maps(?:\/|$)/.test(url.pathname);
  const supported = maps || host === 'maps.google.com' || host === 'maps.app.goo.gl'
    || (host === 'goo.gl' && url.pathname.startsWith('/maps/')) || social.includes(host);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !supported || !url.pathname.slice(1)) {
    throw badInput('請貼上 Google Maps 或店家的社群連結。');
  }
  return value;
}

async function parseReport(request) {
  if (!/^multipart\/form-data\s*;/i.test(request.headers.get('Content-Type') || '')) {
    throw badInput();
  }
  const body = await readBody(request, MAX_FORM_BYTES);
  const form = await new Response(body, { headers: { 'Content-Type': request.headers.get('Content-Type') } })
    .formData().catch(() => { throw badInput(); });
  const kind = textField(form, 'kind', 10);
  const token = textField(form, 'cf-turnstile-response', 2048);
  if (kind === 'url') return { kind, token, sourceUrl: storeUrl(textField(form, 'sourceUrl', 2048)) };
  if (kind !== 'address' && kind !== 'photo') throw badInput();
  const name = textField(form, 'name', 120);
  if (kind === 'address') return { kind, token, name, address: textField(form, 'address', 300) };
  const photo = form.get('photo');
  if (form.getAll('photo').length !== 1 || !(photo instanceof File) || photo.type !== 'image/jpeg'
      || photo.size < 8 || photo.size > MAX_PHOTO_BYTES) {
    throw badInput('請上傳一張壓縮後在 1 MB 以內的照片。');
  }
  const header = new Uint8Array(await photo.slice(0, 3).arrayBuffer());
  const footer = new Uint8Array(await photo.slice(-2).arrayBuffer());
  if (header[0] !== 255 || header[1] !== 216 || header[2] !== 255 || footer[0] !== 255 || footer[1] !== 217) {
    throw badInput('照片格式無法讀取。');
  }
  return { kind, token, name, photo };
}

async function verifyTurnstile(env, token, host) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token }),
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Siteverify unavailable');
  const result = await response.json();
  if (result.success !== true || result.hostname !== host || result.action !== 'store_report') {
    throw new InputError(403, 'captcha', '驗證失敗，請再試一次。');
  }
}

function clearPhoto(env, report, abandoned = false) {
  return env.PHOTOS.delete(report.photo_key).then(() => {
    const sql = abandoned
      ? "DELETE FROM reports WHERE id = ? AND photo_key = ? AND status = 'uploading'"
      : 'UPDATE reports SET photo_key = NULL, photo_bytes = 0, photo_delete_requested_at = NULL WHERE id = ? AND photo_key = ?';
    return env.REPORTS.prepare(sql).bind(report.id, report.photo_key).run();
  });
}

async function receiveReport(request, env, host) {
  sameOrigin(request);
  if (!env.TURNSTILE_SECRET) {
    throw new InputError(503, 'submissions_unavailable', '目前暫停接收店家推薦。');
  }
  const { kind, token, name, address, sourceUrl, photo } = await parseReport(request);
  await verifyTurnstile(env, token, host);
  const id = crypto.randomUUID();
  const now = new Date();
  const key = photo ? 'reports/' + id + '.jpg' : null;
  try {
    await env.REPORTS.prepare(`
      INSERT INTO reports (id, kind, name, address, source_url, photo_key, photo_bytes, upload_day, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, kind, name ?? null, address ?? null, sourceUrl ?? null, key,
      photo?.size ?? 0, photo ? TAIPEI_DATE.format(now) : null,
      photo ? 'uploading' : 'pending', now.toISOString()).run();
  } catch (error) {
    if (String(error).includes('PHOTO_QUOTA')) {
      throw new InputError(429, 'photo_quota', '照片目前已達額度，請改用連結或地址。');
    }
    throw error;
  }
  if (photo) {
    try {
      await env.PHOTOS.put(key, photo, { httpMetadata: { contentType: 'image/jpeg' } });
    } catch (error) {
      await clearPhoto(env, { id, photo_key: key }, true).catch(() => {});
      throw error;
    }
    const result = await env.REPORTS.prepare("UPDATE reports SET status = 'pending' WHERE id = ? AND status = 'uploading'")
      .bind(id).run();
    if (!result.meta.changes) throw new Error('Upload reservation expired');
  }
  return json({ ok: true }, 201);
}

async function listReports(url, env, status) {
  const page = Number(url.searchParams.get('page') ?? 1);
  if (!['pending', ...REVIEWED].includes(status) || !Number.isSafeInteger(page) || page < 1 || page > 10000) {
    throw badInput('審閱狀態或頁碼無效。');
  }
  const { results } = await env.REPORTS.prepare(`
    SELECT id, kind, name, address, source_url, photo_key IS NOT NULL AS has_photo,
           status, created_at, reviewed_at, reviewed_by, verified_reference
    FROM reports WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
  `).bind(status, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE).all();
  return json({ reports: results.slice(0, PAGE_SIZE), hasMore: results.length > PAGE_SIZE });
}

async function reviewReport(request, env) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) throw badInput();
  const input = await readBody(request, 4096);
  const body = await new Response(input).json().catch(() => { throw badInput(); });
  if (!body || typeof body.id !== 'string' || !VALID_REPORT_ID.test(body.id) || !REVIEWED.includes(body.status)
      || (body.verifiedReference !== undefined && (typeof body.verifiedReference !== 'string' || body.verifiedReference.length > 1000))) {
    throw badInput('審閱狀態或查證備註無效。');
  }
  const reference = body.verifiedReference?.trim() || null;
  const report = await env.REPORTS.prepare(`
    UPDATE reports SET status = ?, reviewed_at = ?, reviewed_by = ?, verified_reference = ?
    WHERE id = ? AND status = 'pending'
    RETURNING id
  `).bind(body.status, new Date().toISOString(), 'admin-api-token', reference, body.id).first();
  if (!report) throw new InputError(409, 'already_reviewed', '這筆回報已處理或已不存在，請重新整理。');
  return json({ ok: true });
}

async function deleteReviewedPhoto(env, id) {
  const report = await env.REPORTS.prepare(`
    UPDATE reports SET photo_delete_requested_at = ?
    WHERE id = ? AND status IN ('accepted', 'dismissed') AND photo_key IS NOT NULL
    RETURNING id, photo_key
  `).bind(new Date().toISOString(), id).first();
  if (!report) {
    const current = await env.REPORTS.prepare('SELECT status FROM reports WHERE id = ?').bind(id).first();
    if (!current) return json({ error: 'not_found' }, 404);
    if (!REVIEWED.includes(current.status)) {
      throw new InputError(409, 'review_required', '請先完成這筆回報的審閱。');
    }
    return new Response(null, { status: 204, headers: SERVER_HEADERS });
  }
  try {
    await clearPhoto(env, report);
  } catch {
    console.warn('Reviewed report photo cleanup will retry');
    return json({ photoCleanupPending: true }, 202);
  }
  return new Response(null, { status: 204, headers: SERVER_HEADERS });
}

async function readPhoto(env, id) {
  const report = await env.REPORTS.prepare("SELECT photo_key FROM reports WHERE id = ? AND status = 'pending'")
    .bind(id).first();
  if (!report?.photo_key) return json({ error: 'not_found' }, 404);
  const photo = await env.PHOTOS.get(report.photo_key);
  if (!photo) return json({ error: 'not_found' }, 404);
  return new Response(photo.body, {
    headers: { ...SERVER_HEADERS, 'Content-Type': 'image/jpeg', 'Content-Security-Policy': "default-src 'none'; sandbox" },
  });
}

async function cleanupPhotos(env) {
  const cutoff = new Date(Date.now() - 3_600_000).toISOString();
  const { results } = await env.REPORTS.prepare(`
    SELECT id, status, photo_key FROM reports WHERE photo_key IS NOT NULL
      AND (photo_delete_requested_at IS NOT NULL OR (status = 'uploading' AND created_at < ?))
    ORDER BY created_at LIMIT 20
  `).bind(cutoff).all();
  for (const report of results) {
    try {
      await clearPhoto(env, report, report.status === 'uploading');
    } catch {
      console.warn('Report photo cleanup will retry');
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (url.hostname !== env.PUBLIC_HOST) return json({ error: 'not_found' }, 404);
      const reports = path === '/api/reports';
      if (reports && request.method === 'POST') {
        return await receiveReport(request, env, url.hostname);
      }
      const list = LIST_PATH.exec(path);
      const photo = PHOTO_PATH.exec(path);
      if (!reports && !list && !photo) return json({ error: 'not_found' }, 404);
      if (!await hasAdminToken(request, env)) return unauthorized();
      if (reports && request.method === 'PATCH') return await reviewReport(request, env);
      if (list && request.method === 'GET') return await listReports(url, env, list[1]);
      if (photo && request.method === 'GET') return await readPhoto(env, photo[1]);
      if (photo && request.method === 'DELETE') return await deleteReviewedPhoto(env, photo[1]);
      return json({ error: 'method_not_allowed' }, 405);
    } catch (error) {
      if (error instanceof InputError) return json({ error: error.code, message: error.message }, error.status);
      console.error('Store reports request failed');
      return json({ error: 'unavailable', message: '服務暫時無法處理，請稍後再試。' }, 503);
    }
  },

  async scheduled(_event, env) {
    await cleanupPhotos(env);
  },
};
