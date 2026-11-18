import assert from 'node:assert/strict';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, test } from 'node:test';
import worker from './index.js';

const origin = 'https://minicourse.dev';
const migration = readFileSync(new URL('./migrations/0001_reports.sql', import.meta.url), 'utf8');
const adminToken = 'fixture-reports-admin-token';
crypto.subtle.timingSafeEqual ??= (a, b) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
const image = new Uint8Array([255, 216, 255, 224, 0, 0, 255, 217]);
let db;
let env;
let photos;
let photoWrites;
let deleteFailures;

beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(migration);
  photos = new Map();
  photoWrites = 0;
  deleteFailures = 0;
  env = {
    PUBLIC_HOST: 'minicourse.dev',
    TURNSTILE_SECRET: 'fixture',
    REPORTS_ADMIN_TOKEN_SHA256: createHash('sha256').update(adminToken).digest('hex'),
    REPORTS: {
      prepare(sql) {
        return {
          bind(...args) {
            const statement = db.prepare(sql);
            return {
              async run() { return { meta: statement.run(...args) }; },
              async first() { return statement.get(...args); },
              async all() { return { results: statement.all(...args) }; },
            };
          },
        };
      },
    },
    PHOTOS: {
      async put(key, file) { photoWrites++; photos.set(key, file); },
      async get(key) { const body = photos.get(key); return body ? { body } : null; },
      async delete(key) {
        if (deleteFailures) { deleteFailures--; throw new Error('temporary'); }
        photos.delete(key);
      },
    },
  };
});

afterEach(() => db.close());

function turnstile(t, result = { success: true, hostname: 'minicourse.dev', action: 'store_report' }) {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    return Response.json(result);
  });
}

function call(path, options = {}, token) {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', 'Bearer ' + token);
  return worker.fetch(new Request(origin + path, { ...options, headers }), env);
}

function submit(fields, location = origin) {
  const form = new FormData();
  form.set('cf-turnstile-response', 'fixture-token');
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return call('/api/reports', { method: 'POST', headers: { Origin: location }, body: form });
}

function photoSubmission() {
  return submit({ kind: 'photo', name: '測試店家', photo: new File([image], 'store.jpg', { type: 'image/jpeg' }) });
}

function deletePhoto(id, token = adminToken) {
  return call('/api/reports/' + id + '/photo', { method: 'DELETE' }, token);
}

function review(id, status, token = adminToken) {
  return call('/api/reports', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, verifiedReference: '已核對店址' }),
  }, token);
}

test('accepts links and addresses while enforcing the verified origin', async t => {
  turnstile(t);
  const google = await submit({ kind: 'url', sourceUrl: 'https://maps.app.goo.gl/fixture' });
  const address = await submit({ kind: 'address', name: '測試', address: '測試地址' });
  const otherOrigin = await submit({ kind: 'address', name: '測試', address: '測試地址' }, 'https://example.test');
  const otherUrl = await submit({ kind: 'url', sourceUrl: 'https://example.test/' });
  assert.equal(google.status, 201);
  assert.deepEqual(await google.json(), { ok: true });
  assert.equal(address.status, 201);
  assert.deepEqual(await address.json(), { ok: true });
  assert.equal(otherOrigin.status, 403);
  assert.equal(otherUrl.status, 400);
  assert.equal(db.prepare('SELECT count(*) AS total FROM reports').get().total, 2);
  assert.equal(photoWrites, 0);
});

test('keeps admin reports available while public submissions are unconfigured', async t => {
  delete env.TURNSTILE_SECRET;
  const read = t.mock.method(Response.prototype, 'formData');
  const result = await photoSubmission();
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, 'submissions_unavailable');
  assert.equal(read.mock.callCount(), 0);
  assert.equal(db.prepare('SELECT count(*) AS total FROM reports').get().total, 0);
  assert.equal(photoWrites, 0);
  const list = await call('/api/reports/pending', {}, adminToken);
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { reports: [], hasMore: false });
});

test('rejects a mismatched Turnstile action before storage', async t => {
  turnstile(t, { success: true, hostname: 'minicourse.dev', action: 'other_action' });
  assert.equal((await photoSubmission()).status, 403);
  assert.equal(db.prepare('SELECT count(*) AS total FROM reports').get().total, 0);
  assert.equal(photoWrites, 0);
});

test('does not parse or store an oversized request', async t => {
  turnstile(t);
  const response = await call('/api/reports', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'multipart/form-data; boundary=B' },
    body: 'x'.repeat(1_016_385),
  });
  assert.equal(response.status, 413);
  assert.equal(photoWrites, 0);
});

test('reserves shared daily bytes before concurrent R2 writes, even after cleanup', async t => {
  turnstile(t);
  db.prepare('UPDATE photo_storage SET max_daily_bytes = ?').run(image.length);
  const results = await Promise.all([photoSubmission(), photoSubmission()]);
  assert.deepEqual(results.map(response => response.status).sort(), [201, 429]);
  const rejected = results.find(response => response.status === 429);
  assert.equal((await rejected.json()).error, 'photo_quota');
  assert.equal(photoWrites, 1);
  assert.equal(db.prepare('SELECT bytes FROM photo_storage').get().bytes, image.length);
  const report = db.prepare('SELECT id, photo_key FROM reports').get();
  assert.equal((await call('/api/reports/' + report.id + '/photo')).status, 401);
  const photo = await call('/api/reports/' + report.id + '/photo', {}, adminToken);
  assert.equal(photo.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(new Uint8Array(await photo.arrayBuffer()), image);
  assert.equal((await deletePhoto(report.id, null)).status, 401);
  assert.equal((await deletePhoto(report.id)).status, 409);
  assert.equal((await review(report.id, 'accepted')).status, 200);
  assert.equal(photos.size, 1);
  assert.equal((await deletePhoto(report.id)).status, 204);
  assert.equal((await deletePhoto(report.id)).status, 204);
  assert.equal(photos.size, 0);
  assert.equal(db.prepare('SELECT bytes FROM photo_storage').get().bytes, 0);
  assert.equal(db.prepare('SELECT bytes FROM photo_daily_usage').get().bytes, image.length);
  assert.equal((await photoSubmission()).status, 429);
  assert.equal((await submit({ kind: 'address', name: '測試', address: '測試地址' })).status, 201);
});

test('applies the storage and photo-count limits independently', async t => {
  turnstile(t);
  db.exec('UPDATE photo_storage SET max_daily_uploads = 1, max_storage_bytes = 0');
  assert.equal((await photoSubmission()).status, 429);
  assert.equal(db.prepare('SELECT count(*) AS total FROM photo_daily_usage').get().total, 0);
  db.exec('UPDATE photo_storage SET max_storage_bytes = 1000');
  assert.equal((await photoSubmission()).status, 201);
  assert.equal((await photoSubmission()).status, 429);
  assert.equal(photoWrites, 1);
});

test('exposes the status path with direct Bearer authentication', async t => {
  turnstile(t);
  assert.equal((await submit({ kind: 'address', name: '測試', address: '測試地址' })).status, 201);
  const path = '/api/reports/pending';
  const missing = await call(path);
  assert.equal(missing.status, 401);
  assert.equal(missing.headers.get('WWW-Authenticate'), 'Bearer realm="store-reports"');
  assert.equal(missing.headers.get('Location'), null);
  assert.deepEqual(await missing.json(), { error: 'unauthorized' });
  assert.equal((await call(path, {}, 'incorrect')).status, 401);
  const list = await call(path, {}, adminToken);
  assert.equal(list.status, 200);
  assert.equal(list.headers.get('Cache-Control'), 'no-store');
  const { reports } = await list.json();
  assert.equal(reports[0].name, '測試');
  assert.equal((await review(reports[0].id, 'accepted', null)).status, 401);
  assert.equal((await call('/api/reports/invalid', {}, adminToken)).status, 400);
  assert.equal((await call('/api/admin/reports', {}, adminToken)).status, 404);
  assert.equal((await call('/admin/reports', {}, adminToken)).status, 404);
});

test('updates with a Bearer token and retries independent photo deletion', async t => {
  turnstile(t);
  assert.equal((await photoSubmission()).status, 201);
  const { reports } = await (await call('/api/reports/pending', {}, adminToken)).json();
  assert.equal((await review(reports[0].id, 'dismissed')).status, 200);
  await worker.scheduled({}, env);
  assert.equal(photos.size, 1);
  deleteFailures = 1;
  const result = await deletePhoto(reports[0].id);
  assert.equal(result.status, 202);
  assert.equal((await result.json()).photoCleanupPending, true);
  assert.equal(photos.size, 1);
  await worker.scheduled({}, env);
  assert.equal(photos.size, 0);
  const stored = db.prepare('SELECT status, photo_key, reviewed_by FROM reports').get();
  assert.equal(stored.status, 'dismissed');
  assert.equal(stored.photo_key, null);
  assert.equal(stored.reviewed_by, 'admin-api-token');
});
