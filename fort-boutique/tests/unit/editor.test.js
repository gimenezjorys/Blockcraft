// M8 : logique de l'éditeur d'aménagement (G6.5) et Conseil de Mamie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../helpers/game.js';
import { openEditor, itemAt, moveItem, rotateItem, storeItem, placeFromStorage, commitEditor, editorLengths, pathPolylines, mamieAdvice } from '../../src/game/editor.js';
import { validateLayout } from '../../src/game/shop.js';
import { pathLengths } from '../../src/game/catalog.js';

function editorGame() {
  const g = newGame(5, (s) => {
    s.player.level = 3;
    s.shops.q1.storage = ['comptoir', 'comptoir'];
  });
  return { g, ed: openEditor(g.shop, 'q1') };
}

test('copie de travail : rien ne change dans la boutique tant qu’on ne valide pas', () => {
  const { g, ed } = editorGame();
  const before = JSON.stringify(g.shop.layout);
  const i = ed.layout.findIndex((it) => it.id === 'etagere');
  ed.layout[i] = { ...ed.layout[i], x: 4 };
  assert.equal(JSON.stringify(g.shop.layout), before);
  assert.equal(itemAt(ed, ed.layout[i].x, ed.layout[i].y), i);
  assert.equal(itemAt(ed, -1, -1), -1);
});

test('déplacement invalide refusé (case réservée, chemin bloqué) ; la caisse ne se range pas', () => {
  const { ed } = editorGame();
  const i = ed.layout.findIndex((it) => it.id === 'etagere');
  const orig = { ...ed.layout[i] };
  // La case de la porte d'entrée est réservée.
  const r = moveItem(ed, i, 2, 5);
  assert.equal(r.ok, false);
  assert.deepEqual(ed.layout[i], orig);
  assert.equal(ed.moves, 0);
  const reg = ed.layout.findIndex((it) => it.id === 'caisse');
  assert.equal(storeItem(ed, reg).ok, false);
  assert.equal(rotateItem(ed, i).reason, 'fixed', 'un meuble 1 × 1 ne tourne pas');
});

test('ranger puis reposer depuis la Réserve ; valider enregistre une disposition valide', () => {
  const { g, ed } = editorGame();
  const i = ed.layout.findIndex((it) => it.id === 'etagere');
  assert.equal(storeItem(ed, i).ok, true);
  assert.ok(ed.storage.includes('etagere'));
  // Pose d'un comptoir sur la première case libre valide.
  let placed = null;
  for (let y = 0; y < 6 && !placed; y++) {
    for (let x = 0; x < 5 && !placed; x++) {
      const k = ed.storage.indexOf('comptoir');
      const r = placeFromStorage(ed, k, x, y, 0);
      if (r.ok) placed = { x, y, idx: r.idx };
    }
  }
  assert.ok(placed);
  assert.equal(ed.layout[placed.idx].id, 'comptoir');
  assert.equal(commitEditor(ed, g.shop), true);
  assert.equal(validateLayout('q1', 0, g.shop.layout).ok, true);
  assert.deepEqual(g.shop.storage.slice().sort(), ['comptoir', 'etagere']);
});

test('longueurs des trajets et flèches par rapport à l’ouverture ; tracés depuis chaque entrée au sol', () => {
  const { ed } = editorGame();
  const L0 = editorLengths(ed);
  assert.equal(L0.monstersDelta, 0);
  assert.equal(L0.customersDelta, 0);
  const lines = pathPolylines(ed);
  assert.ok(lines.monsters.length >= 1);
  assert.ok(lines.customers.length >= 1);
  for (const p of lines.monsters) assert.ok(p.length >= 2);
});

test('Conseil de Mamie : allonge le trajet des Grignotins, clients ≤ +30 %, disposition valide et rapide', () => {
  const { g } = editorGame();
  // Disposition naïve : tous les comptoirs alignés au fond, rien ne gêne les Grignotins.
  const t0 = performance.now();
  const a = mamieAdvice('q1', 0, g.shop.layout.concat([{ id: 'comptoir', x: 1, y: 2, rot: 0 }, { id: 'comptoir', x: 3, y: 2, rot: 0 }]));
  const ms = performance.now() - t0;
  assert.ok(ms < 1500, `${ms.toFixed(0)} ms`);
  assert.ok(a.gain >= 0);
  assert.equal(validateLayout('q1', 0, a.layout).ok, true);
  const L = pathLengths('q1', 0, a.layout);
  assert.ok(L.customers <= a.start.customers * 1.3 + 1e-9);
  assert.ok(L.monsters >= a.start.monsters);
  if (a.moves.length) assert.ok(a.gain > 0);
});
