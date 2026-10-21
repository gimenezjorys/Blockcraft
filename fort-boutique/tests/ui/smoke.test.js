// Test de fumée : dist/index.html se charge sans erreur, un canvas existe, un tap change d'écran (M0, D1.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadGame, ROOT } from '../helpers/dom.js';

for (const build of ['dist', 'dist-test']) {
  test(`${build}/index.html : chargement sans erreur, canvas, tap -> autre écran`, async () => {
    const g = loadGame({ build });
    try {
      assert.deepEqual(g.errors, [], 'aucune erreur JavaScript');
      const canvas = g.$('canvas#game');
      assert.ok(canvas, 'un canvas existe');
      assert.equal(g.screenId(), 'title');
      const titleEl = g.$('.screen-title');
      g.fingers.start(1, titleEl, 180, 320);
      g.fingers.end(1);
      assert.notEqual(g.screenId(), 'title', 'le tap quitte l’écran titre');
      await new Promise((r) => setTimeout(r, 50));
      assert.deepEqual(g.errors, []);
    } finally {
      g.close();
    }
  });
}

test('dist/index.html : autonome (aucune ressource externe ni module), budget 600 Ko, pas de hooks de test', () => {
  const file = join(ROOT, 'dist/index.html');
  const html = readFileSync(file, 'utf8');
  assert.ok(statSync(file).size <= 600 * 1024);
  assert.ok(!/type=["']?module/.test(html), 'aucun type="module"');
  assert.ok(!/<script[^>]+src=/.test(html), 'aucun script externe');
  assert.ok(!/<link[^>]+stylesheet/.test(html), 'aucune feuille externe');
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/xmlns(:\w+)?="[^"]*"/g, '')), 'aucune URL externe');
  assert.ok(!html.includes('__FB_TEST__'), 'pas de hooks de test dans dist');
  assert.ok(html.includes('<meta name="theme-color" content="#2E4B44">'));
  assert.ok(html.includes('viewport-fit=cover'));
  assert.ok(html.includes('<title>Fort Boutique</title>'));
});
