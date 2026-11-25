import assert from 'node:assert/strict';
import test from 'node:test';
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
