import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogue } from '../public/designers/js/data.js';
import { readProducts, workInHall } from '../public/designers/js/products.js';
import { hallPages } from '../public/designers/js/hall-pages.js';
import { legacyDesignerDestination } from '../public/designers/js/legacy-entry.js';
import { designerViewPath, designerWalkPath, resolveDesignerRoute } from '../public/designers/js/routes.js';

const origin = 'https://minicourse.dev';
const oshen = '/designers/halls/oshen/';

test('hall entrances and aisle URLs reopen the same walk without a fragment', () => {
  for (const hall of hallPages) {
    const first = hall.code + '01';
    assert.equal(designerWalkPath(first), hall.path);
    assert.equal(resolveDesignerRoute(new URL(hall.path, origin)).target, first);
  }
  for (let i = 2; i <= 8; i++) {
    const code = 'O0' + i;
    const url = new URL(designerWalkPath(code), origin);
    assert.equal(url.pathname, oshen + code.toLowerCase() + '/');
    assert.equal(url.hash, '');
    assert.equal(resolveDesignerRoute(url).target, code);
    for (const mode of ['list', 'map']) {
      const view = new URL(designerViewPath(code, mode), origin);
      assert.equal(view.hash, '');
      assert.deepEqual(resolveDesignerRoute(view), { mode, target: code });
    }
  }
});

test('legacy bookmarks resolve to the original aisle, booth or designer', () => {
  for (const [fragment, destination] of [
    ['#/walk/O02', oshen + 'o02/'],
    ['#/walk/O02-01/open', oshen + 'o02/?booth=O02-01&open=1'],
    ['#/list', oshen + '?view=list'],
    ['#/map', oshen + '?view=map'],
    ['#/designer/wolfsignal-tw', '/designers/wolfsignal-tw/'],
  ]) {
    const url = legacyDesignerDestination(new URL(oshen + fragment, origin));
    assert.equal(url.href, new URL(destination, origin).href);
  }
  const booth = new URL(designerWalkPath('O02', 'O02-01'), origin);
  assert.equal(booth.hash, '');
  assert.equal(resolveDesignerRoute(booth).target, 'O02-01');
});

test('the voting hall shows selected works while the original booth keeps its full catalogue', () => {
  const products = [
    { id: 'earlier', url: '/media/earlier.webp' },
    { id: 'vote', url: '/media/vote.webp', halls: ['V'] },
    { id: 'hidden', url: '/media/hidden.webp', halls: ['V'], disabled: true },
  ];
  const catalogue = createCatalogue({ designers: [
    { id: 'artist', name: 'Artist', additionalHalls: ['V'], productImages: products },
  ] });
  const original = catalogue.aisles.get('O01').islands[0].booths[0];
  const exhibit = catalogue.aisles.get('V01').islands[0].booths[0];
  assert.equal(catalogue.designerBooths.get('artist'), original.id);
  assert.deepEqual(original.works.map(work => work.id), ['earlier', 'vote']);
  assert.deepEqual(exhibit.works.map(work => work.id), ['vote']);
  assert.equal(exhibit.total, 1);
  const separateCatalogue = readProducts({ designerId: 'artist', products }, 'artist', origin);
  assert.deepEqual(separateCatalogue.filter(work => workInHall(work, 'V')).map(work => work.id), ['vote']);
});

test('a hall can keep its published booth numbers when earlier designers join it', () => {
  const designers = [
    { id: 'first', name: 'First' },
    { id: 'second', name: 'Second', additionalHalls: ['V'] },
    { id: 'third', name: 'Third' },
    { id: 'fourth', name: 'Fourth', additionalHalls: ['V'] },
  ];
  const booths = (catalogue, aisle) => catalogue.aisles.get(aisle).islands
    .flatMap(island => island.booths.map(booth => [booth.id, booth.store]));
  const original = createCatalogue({ designers });
  const expanded = createCatalogue({
    designers: designers.map(designer => ({ ...designer, additionalHalls: ['V'] })),
    boothOrder: { V: ['second', 'fourth'] },
  });
  assert.deepEqual(booths(expanded, 'V01'), [
    ...booths(original, 'V01'), ['V01-03', 'first'], ['V01-04', 'third'],
  ]);
  assert.deepEqual(booths(expanded, 'O01'), booths(original, 'O01'));
});
