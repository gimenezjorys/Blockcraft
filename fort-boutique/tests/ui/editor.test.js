// M8 : l'éditeur d'aménagement au doigt (G6.5) — vrais touchstart / touchmove / touchend sur le canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame, calendarDoneToday } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';
import { defaultSave } from '../../src/save/schema.js';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';
import { districtDef } from '../../src/data/districts.js';
import { validateLayout, gridOrigin } from '../../src/game/shop.js';
import { pathLengths } from '../../src/game/catalog.js';

const C = 48;
/** Instantané de la scène, recopié dans ce contexte (les tableaux de jsdom ne sont pas ceux de Node). */
const sceneOf = (g) => JSON.parse(JSON.stringify(g.hooks.getState().scene));

/** Matin du jour 4, niveau 3 (Aménager ouvert), un comptoir dans la Réserve. */
function editorSave(mutate) {
  const s = defaultSave({ seed: 3, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  Object.assign(s.stats, { cycles: 3, nights: 3 });
  Object.assign(s.player, { level: 3, coins: 500 });
  const shop = s.shops.q1;
  Object.assign(shop, { day: 4, night: 4, lastNightStars: 3 });
  Object.assign(shop.phase, { name: 'morning', dawnClaimed: true });
  shop.pads.done = districtDef('q1').pads.map((p) => p.id);
  shop.storage = ['comptoir'];
  if (mutate) mutate(s);
  return { [SAVE_KEY]: serialize(calendarDoneToday(s)) };
}

function openEditor(g, bot) {
  bot.tapEl('.screen-title');
  g.hooks.advance(300);
  assert.equal(g.hooks.getState().screen, 'morning');
  assert.ok(g.$('#hub-editor .badge-dot'), 'Aménager brille la première fois');
  bot.tapEl('#hub-editor');
  g.hooks.advance(300);
  assert.equal(g.hooks.getState().screen, 'editor');
  const scene = sceneOf(g);
  assert.equal(scene.editor, true);
  return scene;
}

/** Centre d'une case de la grille, en pixels (fenêtre 360 × 640, échelle 1). */
const cellPx = (grid, x, y) => ({ x: gridOrigin(grid.w).x + (x + 0.5) * C, y: grid.origin.y + (y + 0.5) * C });

/** Glisse au doigt du point a au point b, en plusieurs étapes. */
function drag(g, a, b, steps = 6) {
  const canvas = g.$('#game');
  g.fingers.start(5, canvas, a.x, a.y);
  g.hooks.advance(16);
  for (let i = 1; i <= steps; i++) {
    g.fingers.move(5, a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
    g.hooks.advance(16);
  }
  const mid = sceneOf(g).drag;
  g.fingers.end(5);
  g.hooks.advance(50);
  return mid;
}

/** Première case où ce meuble peut aller (et une case où il ne peut pas). */
function findCells(snap, idx) {
  const { layout, grid } = snap;
  let valid = null;
  let invalid = null;
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (layout.some((it, i) => i !== idx && it.x === x && it.y === y)) continue;
      const next = layout.map((it, i) => (i === idx ? { ...it, x, y } : it));
      const ok = validateLayout('q1', 0, next).ok;
      if (ok && !valid && (x !== layout[idx].x || y !== layout[idx].y)) valid = { x, y };
      if (!ok && !invalid) invalid = { x, y };
    }
  }
  return { valid, invalid };
}

test('Aménager : glisser un meuble au doigt le déplace, les longueurs de trajet se mettent à jour, Valider enregistre', () => {
  const g = loadGame({ storage: editorSave() });
  try {
    const bot = new TouchBot(g);
    const snap = openEditor(g, bot);
    const idx = snap.layout.findIndex((it) => it.id === 'etagere');
    const it = snap.layout[idx];
    const { valid } = findCells(snap, idx);
    assert.ok(valid, 'une case libre valide existe');
    const label0 = g.$('#ed-monsters').textContent;
    const mid = drag(g, cellPx(snap.grid, it.x, it.y), cellPx(snap.grid, valid.x, valid.y));
    assert.equal(mid.valid, true, `fantôme vert pendant le glisser ${JSON.stringify(mid)} vers ${JSON.stringify(valid)}`);
    const after = sceneOf(g);
    assert.deepEqual({ x: after.layout[idx].x, y: after.layout[idx].y }, valid);
    assert.equal(after.moves, 1);
    const expected = pathLengths('q1', 0, after.layout);
    assert.match(g.$('#ed-monsters').textContent, new RegExp(expected.monsters.toFixed(1).replace('.', ',')));
    if (Math.abs(expected.monsters - pathLengths('q1', 0, snap.layout).monsters) > 0.05) assert.notEqual(g.$('#ed-monsters').textContent, label0);
    bot.tapEl('#ed-validate');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'morning');
    const saved = parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;
    const moved = saved.shops.q1.layout[idx];
    assert.deepEqual({ x: moved.x, y: moved.y }, valid, 'disposition sauvegardée');
    assert.equal(saved.progress.flags.editorSeen, true);
    assert.equal(g.$('#hub-editor .badge-dot'), null, 'la pastille disparaît');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Aménager : un placement invalide est refusé (fantôme rouge, le meuble revient), Annuler restaure tout', () => {
  const g = loadGame({ storage: editorSave() });
  try {
    const bot = new TouchBot(g);
    const snap = openEditor(g, bot);
    const idx = snap.layout.findIndex((it) => it.id !== 'caisse');
    const it = snap.layout[idx];
    const { invalid, valid } = findCells(snap, idx);
    assert.ok(invalid, 'une case invalide existe (case réservée ou chemin bloqué)');
    const mid = drag(g, cellPx(snap.grid, it.x, it.y), cellPx(snap.grid, invalid.x, invalid.y));
    assert.equal(mid.valid, false, 'fantôme rouge');
    let st = sceneOf(g);
    assert.deepEqual({ x: st.layout[idx].x, y: st.layout[idx].y }, { x: it.x, y: it.y }, 'retour à la place d’origine');
    // Un déplacement valide, un meuble rangé, puis Annuler : la boutique d'avant revient.
    drag(g, cellPx(snap.grid, it.x, it.y), cellPx(snap.grid, valid.x, valid.y));
    st = sceneOf(g);
    assert.equal(st.moves, 1);
    assert.equal(st.selected >= 0, true, 'le meuble touché est sélectionné');
    bot.tapEl('#ed-cancel');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'morning');
    const saved = parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;
    assert.deepEqual(saved.shops.q1.layout.map((x) => [x.id, x.x, x.y]), snap.layout.map((x) => [x.id, x.x, x.y]));
    assert.deepEqual(saved.shops.q1.storage, ['comptoir']);
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Aménager : poser un meuble de la Réserve en le faisant glisser depuis la barre du bas', () => {
  const g = loadGame({ storage: editorSave() });
  try {
    const bot = new TouchBot(g);
    const snap = openEditor(g, bot);
    const item = g.$('.ed-res-item[data-furniture="comptoir"]');
    assert.ok(item);
    // Case libre valide pour le comptoir.
    let target = null;
    for (let y = 0; y < snap.grid.h && !target; y++) {
      for (let x = 0; x < snap.grid.w && !target; x++) {
        if (snap.layout.some((it) => it.x === x && it.y === y)) continue;
        if (validateLayout('q1', 0, snap.layout.concat([{ id: 'comptoir', x, y, rot: 0 }])).ok) target = { x, y };
      }
    }
    assert.ok(target);
    const p = cellPx(snap.grid, target.x, target.y);
    g.fingers.start(6, item, 40, 600);
    g.hooks.advance(16);
    for (let i = 1; i <= 5; i++) {
      g.fingers.move(6, 40 + ((p.x - 40) * i) / 5, 600 + ((p.y - 600) * i) / 5);
      g.hooks.advance(16);
    }
    g.fingers.end(6);
    g.hooks.advance(50);
    const st = sceneOf(g);
    assert.deepEqual(st.storage, []);
    assert.ok(st.layout.some((it) => it.id === 'comptoir' && it.x === target.x && it.y === target.y));
    assert.ok(g.$('.ed-res-empty'), 'la Réserve est vide');
    bot.tapEl('#ed-validate');
    g.hooks.advance(300);
    const scene = sceneOf(g);
    assert.ok(scene.furniture.some((f) => f.id === 'comptoir' && f.x === target.x && f.y === target.y), 'la boutique est reconstruite');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('Aménager : toucher une étagère puis le bouton produit change ce qu’elle expose (G7.6)', () => {
  const g = loadGame({ storage: editorSave() });
  try {
    const bot = new TouchBot(g);
    const snap = openEditor(g, bot);
    assert.ok(g.$('#ed-product').hidden, 'rien de sélectionné : pas de bouton produit');
    const idx = snap.layout.findIndex((it) => it.id === 'etagere');
    const it = snap.layout[idx];
    const p = cellPx(snap.grid, it.x, it.y);
    g.fingers.tap(g.$('#game'), p.x, p.y, 8);
    g.hooks.advance(50);
    assert.equal(sceneOf(g).selected, idx);
    assert.equal(g.$('#ed-product').hidden, false);
    const before = g.$('#ed-product').dataset.product;
    bot.tapEl('#ed-product');
    g.hooks.advance(50);
    const after = g.$('#ed-product').dataset.product;
    assert.notEqual(after, before);
    assert.equal(sceneOf(g).layout[idx].product || '', after);
    bot.tapEl('#ed-validate');
    g.hooks.advance(300);
    const saved = parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;
    assert.equal(saved.shops.q1.layout[idx].product || '', after);
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
