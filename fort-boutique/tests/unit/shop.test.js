// M3 : grille, BFS, validation des dispositions (G6.4), collisions et glissement du marchand (G6.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bfs, pathFrom, nextStep } from '../../src/game/pathfinding.js';
import { validateLayout, gridSize, reservedCells, districtEntrances, itemCells } from '../../src/game/shop.js';
import { moveCircle, stepPlayer, createPlayer } from '../../src/game/player.js';
import { createGame, furnitureAt } from '../../src/game/state.js';
import { stepGame } from '../../src/game/phases.js';
import { defaultSave, defaultShop } from '../../src/save/schema.js';
import { DISTRICTS } from '../../src/data/districts.js';

const SAVE = () => defaultSave({ seed: 5, now: 0 });

test('tailles E0 à E3 (G6.1)', () => {
  assert.deepEqual(gridSize(0), [5, 6]);
  assert.deepEqual(gridSize(1), [6, 7]);
  assert.deepEqual(gridSize(2), [7, 8]);
  assert.deepEqual(gridSize(3), [7, 9]);
});

test('cases réservées de l’Épicerie (G6.2)', () => {
  const r = reservedCells('q1', 5, 6);
  const at = (x, y) => r.get(y * 5 + x);
  assert.equal(at(2, 5), 'door');
  assert.equal(at(1, 0), 'backdoor');
  assert.equal(at(0, 3), 'windowLeft');
  assert.equal(at(4, 1), 'windowRight');
  assert.equal(r.size, 4, 'pas de trappe ni de case pour la cheminée au Q1');
  const q3 = reservedCells('q3', 7, 9);
  assert.equal(q3.get((9 - 4) * 7 + 2), 'trapdoor');
  const ent = districtEntrances('q2', 6, 7).find((e) => e.kind === 'chimney');
  assert.deepEqual([ent.x, ent.y, ent.overhead], [4, 0, true]);
});

test('BFS : distances, cases inaccessibles, chemin', () => {
  // 4 × 3, mur en colonne 1 sauf en bas.
  const w = 4;
  const h = 3;
  const wall = new Set([1, 5]);
  const d = bfs(w, h, [0], (i) => !wall.has(i));
  assert.equal(d[0], 0);
  assert.equal(d[4], 1);
  assert.equal(d[8], 2);
  assert.equal(d[9], 3);
  assert.equal(d[1], -1);
  assert.equal(d[3], 7);
  const p = pathFrom(d, w, h, 3);
  assert.equal(p.length, 8);
  assert.equal(p[p.length - 1], 0);
  assert.equal(nextStep(d, w, h, 0), -1);
});

test('disposition de départ et disposition complète de l’Épicerie valides', () => {
  const shop = defaultShop('q1');
  assert.deepEqual(validateLayout('q1', 0, shop.layout), { ok: true });
  const full = shop.layout.concat(DISTRICTS.q1.pads.map((p) => ({ id: p.furniture, x: p.x, y: p.y, rot: 0 })));
  assert.equal(full.length, 9);
  assert.deepEqual(validateLayout('q1', 0, full), { ok: true });
});

test('validation : case réservée refusée', () => {
  const layout = defaultShop('q1').layout.concat([{ id: 'comptoir', x: 0, y: 3 }]);
  assert.equal(validateLayout('q1', 0, layout).reason, 'reserved');
  const onDoor = defaultShop('q1').layout.concat([{ id: 'comptoir', x: 2, y: 5 }]);
  assert.equal(validateLayout('q1', 0, onDoor).reason, 'reserved');
});

test('validation : chemin bloqué refusé (une entrée future ne rejoint plus la caisse)', () => {
  // On mure la colonne 0..4 à la ligne 2 sauf rien : les entrées du haut sont coupées de la caisse.
  const wall = [0, 1, 2, 3, 4].map((x) => ({ id: 'comptoir', x, y: 2 }));
  const layout = [{ id: 'caisse', x: 3, y: 4 }, { id: 'etagere', x: 0, y: 4 }, ...wall];
  const r = validateLayout('q1', 0, layout);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'path');
  // La fenêtre droite (nuit 5) est une entrée future : elle compte aussi.
  const cutRight = [{ id: 'caisse', x: 3, y: 4 }, { id: 'comptoir', x: 3, y: 1 }, { id: 'comptoir', x: 4, y: 0 }, { id: 'comptoir', x: 4, y: 2 }];
  assert.equal(validateLayout('q1', 0, cutRight).reason, 'path');
});

test('validation : meuble à accès sans case libre atteignable refusé', () => {
  // La cagette (0,0) n'a qu'une voisine libre, (1,0), elle-même enfermée par trois comptoirs.
  const layout = [
    { id: 'caisse', x: 3, y: 4 },
    { id: 'cagette', x: 0, y: 0 },
    { id: 'comptoir', x: 0, y: 1 },
    { id: 'comptoir', x: 1, y: 1 },
    { id: 'comptoir', x: 2, y: 0 },
  ];
  assert.equal(validateLayout('q1', 0, layout).reason, 'access');
  // Avec seulement deux comptoirs, (1,0) rejoint la porte : valide.
  assert.equal(validateLayout('q1', 0, layout.slice(0, 4)).ok, true);
  const encl = [{ id: 'caisse', x: 3, y: 4 }, { id: 'etagere', x: 4, y: 5 }, { id: 'comptoir', x: 3, y: 5 }, { id: 'comptoir', x: 4, y: 4 }];
  assert.equal(validateLayout('q1', 0, encl).reason, 'access');
});

test('validation : caisse sur les deux dernières lignes, chevauchements et bords', () => {
  assert.equal(validateLayout('q1', 0, [{ id: 'caisse', x: 3, y: 2 }]).reason, 'register');
  assert.equal(validateLayout('q1', 0, [{ id: 'etagere', x: 0, y: 4 }]).reason, 'register');
  assert.equal(validateLayout('q1', 0, [{ id: 'caisse', x: 3, y: 4 }, { id: 'etagere', x: 3, y: 4 }]).reason, 'overlap');
  assert.equal(validateLayout('q1', 0, [{ id: 'caisse', x: 3, y: 4 }, { id: 'etagere', x: 5, y: 1 }]).reason, 'bounds');
  // Meuble 2 × 1 qui dépasse.
  assert.equal(validateLayout('q2', 0, [{ id: 'caisse', x: 3, y: 4 }, { id: 'four', x: 4, y: 2, rot: 0 }]).reason, 'bounds');
  assert.deepEqual(itemCells({ id: 'four', x: 1, y: 2, rot: 1 }), [[1, 2], [1, 3]]);
});

test('collisions : le marchand glisse le long d’un mur au lieu de s’arrêter', () => {
  const solid = (cx, cy) => cx === 2; // colonne 2 pleine
  const p = { x: 1.5, y: 2.5, r: 0.32 };
  // Diagonale vers le mur (droite + bas) : x bloqué, y continue.
  for (let i = 0; i < 60; i++) moveCircle(p, 0.05, 0.05, 5, 6, solid);
  assert.ok(p.x <= 2 - 0.32 + 1e-6, `bloqué par le mur : x=${p.x}`);
  assert.ok(p.y > 5, `a glissé le long du mur : y=${p.y}`);
  assert.ok(p.y <= 6 - 0.32 + 1e-6, 'reste dans la boutique');
});

test('collisions : coin arrondi et murs de la boutique', () => {
  const solid = (cx, cy) => cx === 2 && cy === 2;
  const p = { x: 1.5, y: 1.5, r: 0.32 };
  for (let i = 0; i < 40; i++) moveCircle(p, 0.05, 0.05, 5, 6, solid);
  const qx = Math.max(2, Math.min(p.x, 3));
  const qy = Math.max(2, Math.min(p.y, 3));
  assert.ok(Math.hypot(p.x - qx, p.y - qy) >= 0.32 - 1e-6, 'jamais dans la case pleine');
  const q = { x: 0.5, y: 0.5, r: 0.32 };
  moveCircle(q, -3, -3, 5, 6, () => false);
  assert.ok(Math.abs(q.x - 0.32) < 1e-9 && Math.abs(q.y - 0.32) < 1e-9);
});

test('marchand : 3,0 cases/s au joystick (G6.3)', () => {
  const p = createPlayer(0.5, 3.5);
  for (let i = 0; i < 60; i++) stepPlayer(p, 1, 0, 3.0, 1 / 60, 10, 10, () => false);
  assert.ok(Math.abs(p.x - 3.5) < 1e-6, `x=${p.x}`);
  assert.equal(p.moving, true);
});

test('partie : grille E0, trois meubles, marchand bloqué par la caisse', () => {
  const g = createGame({ save: SAVE() });
  assert.equal(g.grid.w, 5);
  assert.equal(g.grid.h, 6);
  assert.deepEqual(g.furn.map((f) => f.id).sort(), ['cagette', 'caisse', 'etagere']);
  assert.equal(furnitureAt(g, 3, 4).id, 'caisse');
  assert.ok(g.register);
  assert.deepEqual([g.player.x, g.player.y], [2.5, 4.5]);
  // Vers la droite : la caisse (3,4) arrête le marchand.
  g.input.x = 1;
  for (let i = 0; i < 90; i++) stepGame(g, 1 / 60);
  assert.ok(g.player.x <= 3 - g.player.r + 1e-6, `x=${g.player.x}`);
  // Champs : la porte rejoint la case d'accès de chaque meuble.
  for (const f of g.furn) assert.ok(f.access >= 0, `${f.id} accessible`);
  assert.ok(g.fields.toRegister[1] >= 0, 'la porte de derrière rejoint la caisse');
});
