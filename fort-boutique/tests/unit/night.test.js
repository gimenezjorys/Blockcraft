// M5 : la nuit (G8, G9.2, G10) — vagues à graine, vol, récupération, étoiles, champ de flux, armure, ralentissements.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, run, teleport, count } from '../helpers/game.js';
import { generateNight, waveCount, waveBudget, eligibleTypes, activeEntrances } from '../../src/game/night/waves.js';
import { theftAmount, keptRatio, starsFor, jarValue } from '../../src/game/night/theft.js';
import { armorReduce, applySlow, effectiveSlow, applyStun, damageMultiplier, clearEffects } from '../../src/game/night/effects.js';
import { startNight, finishNight } from '../../src/game/night/night.js';
import { spawnMonster, scaledHp, scaledLoot, kill } from '../../src/game/night/monsters.js';
import { dealDamage, damageFurniture } from '../../src/game/night/towers.js';
import { ringBell } from '../../src/game/night/merchant.js';
import { computeFields } from '../../src/game/state.js';
import { districtEntrances } from '../../src/game/shop.js';
import { MONSTERS, BOSSES } from '../../src/data/monsters.js';
import { WAVES } from '../../src/data/waves.js';

const ENT = districtEntrances('q1', 5, 6);

/** Partie de nuit prête, sans vagues (on fait apparaître à la main). */
function nightGame(mutate) {
  const g = newGame(21, mutate);
  startNight(g, { dayTakings: 100, waves: { waves: [{ groups: [], boss: null }], golden: -1, newTypes: [] } });
  g.night.state = 'idle';
  return g;
}

function fakeMonster(def, o = {}) {
  const m = { def, armor: def.armor || 0, ...o };
  clearEffects(m);
  return m;
}

test('vagues identiques à graine égale, différentes sinon', () => {
  const p = { seed: 99, districtId: 'q1', week: 1, night: 6, entrances: ENT };
  const a = generateNight(p);
  const b = generateNight(p);
  assert.deepEqual(a, b);
  const c = generateNight({ ...p, seed: 100 });
  assert.notDeepEqual(a.waves, c.waves);
  assert.equal(a.waves.length, 4);
});

test('nombre de vagues et budget de menace (G8.3)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((k) => waveCount(k, 1)), [2, 3, 3, 4, 4, 4, 5]);
  assert.equal(waveCount(3, 2), 5);
  assert.equal(waveCount(7, 2), 6);
  // Formule de G8.3 avec les valeurs de data/waves.js (réglées en M10, D2.5).
  const W = WAVES;
  assert.ok(Math.abs(waveBudget({ k: 1, i: 1, s: 1, districtId: 'q1' }) - W.budgetBase * W.budgetWaveBase) < 1e-9);
  assert.ok(Math.abs(waveBudget({ k: 4, i: 3, s: 2, districtId: 'q2' }) - (W.budgetBase + 3 * W.budgetPerNight) * (W.budgetWaveBase + 2 * W.budgetPerWave) * 1.15 * (1 + W.budgetPerWeek)) < 1e-9);
  // Chaque vague dépense au plus son budget.
  for (let k = 1; k <= 6; k++) {
    const night = generateNight({ seed: k, districtId: 'q1', week: 1, night: k, entrances: ENT });
    night.waves.forEach((w, i) => {
      const cost = w.groups.reduce((s, gr) => s + gr.count * MONSTERS[gr.type].threat, 0);
      assert.ok(cost <= waveBudget({ k, i: i + 1, s: 1, districtId: 'q1' }) + 1e-9, `nuit ${k} vague ${i + 1}`);
      for (const gr of w.groups) if (gr.type !== 'raton_dore') assert.ok(gr.count >= 1 && gr.count <= 5);
    });
  }
});

test('calendrier d’apparition : types déjà introduits, nouveau type seul en vague 1, entrées progressives', () => {
  assert.deepEqual(eligibleTypes('q1', 1, 1), ['raton']);
  assert.deepEqual(eligibleTypes('q1', 4, 1).sort(), ['gloubi', 'raton', 'souris']);
  assert.equal(eligibleTypes('q1', 1, 2).length, 4, 'semaine 2 : tous les types');
  const n2 = generateNight({ seed: 5, districtId: 'q1', week: 1, night: 2, entrances: ENT });
  assert.deepEqual(n2.newTypes, ['souris']);
  assert.ok(n2.waves[0].groups.every((gr) => gr.type === 'souris'), 'la souris arrive seule en vague 1');
  assert.deepEqual(activeEntrances(ENT, 1, 1).map((e) => e.kind), ['backdoor']);
  assert.deepEqual(activeEntrances(ENT, 3, 1).map((e) => e.kind), ['backdoor', 'windowLeft']);
  assert.equal(activeEntrances(ENT, 5, 1).length, 3);
  const n1 = generateNight({ seed: 5, districtId: 'q1', week: 1, night: 1, entrances: ENT });
  assert.ok(n1.waves.every((w) => w.groups.every((gr) => gr.entrance === 'backdoor' || gr.type === 'raton_dore')));
  const q2 = generateNight({ seed: 8, districtId: 'q2', week: 1, night: 1, entrances: districtEntrances('q2', 5, 6) });
  const bats = q2.waves.flatMap((w) => w.groups).filter((gr) => gr.type === 'chauvesouris');
  assert.ok(bats.length && bats.every((gr) => gr.entrance === 'chimney'), 'chauves-souris par la cheminée');
});

test('raton doré : une nuit sur 10 environ, une seule fois', () => {
  let nights = 0;
  for (let s = 0; s < 1000; s++) {
    const n = generateNight({ seed: s, districtId: 'q1', week: 2, night: 3, entrances: ENT });
    const golds = n.waves.flatMap((w) => w.groups).filter((gr) => gr.type === 'raton_dore');
    assert.ok(golds.length <= 1);
    if (golds.length) nights++;
  }
  assert.ok(nights > 70 && nights < 130, `${nights} / 1000`);
});

test('vol : % du Bocal initial, plafonné à ce qui reste ; Bocal minimal 20 × Q', () => {
  assert.equal(theftAmount(0.04, 100, 100), 4);
  assert.equal(theftAmount(0.35, 100, 20), 20, 'plafonné');
  assert.equal(theftAmount(0.04, 100, 0), 0);
  assert.equal(theftAmount(0, 100, 50), 0, 'champiboum ne vole pas');
  assert.equal(theftAmount(0.02, 20, 20), 1, 'au moins une pièce');
  assert.equal(jarValue(1, 10), 20);
  assert.equal(jarValue(1, 153), 77);
  assert.equal(jarValue(3, 50), 60);
});

test('vol puis récupération : le sac rend +10 % au Bocal', () => {
  const g = nightGame();
  const n = g.night;
  assert.equal(n.jarInitial, 50);
  const m = spawnMonster(g, 'raton', 'backdoor');
  m.hp = m.maxHp = 1e6; // survit aux tirs jusqu'à la caisse
  run(g, 9, () => teleport(g, 4.5, 0.5));
  assert.equal(m.thief, true, 'a volé');
  assert.equal(m.carry, 2);
  assert.equal(n.jar, 48);
  kill(g, m, null);
  assert.equal(n.jar, 48 + Math.round(2 * 1.1));
  assert.equal(n.caught, 1);
});

test('voleur qui sort : pièces perdues pour la nuit', () => {
  const g = nightGame((s) => { s.shops.q1.layout = s.shops.q1.layout.filter((it) => it.id === 'caisse'); });
  // Sans meuble qui tire sauf la caisse, un raton costaud s'enfuit.
  const m = spawnMonster(g, 'raton', 'backdoor');
  m.hp = m.maxHp = 1e6;
  const ev = run(g, 30, () => teleport(g, 0.5, 5.5));
  assert.equal(count(ev, 'thief_escape'), 1);
  assert.equal(g.night.lost, 2);
  assert.equal(g.night.jar, 48);
});

test('étoiles : ★ toujours, ★★ dès 70 %, ★★★ à 100 % (pièces récupérées comprises)', () => {
  assert.equal(starsFor(keptRatio(0, 50)), 1);
  assert.equal(starsFor(keptRatio(34, 50)), 1);
  assert.equal(starsFor(keptRatio(35, 50)), 2);
  assert.equal(starsFor(keptRatio(49, 50)), 2);
  assert.equal(starsFor(keptRatio(50, 50)), 3);
  assert.equal(starsFor(keptRatio(51, 50)), 3);
  assert.equal(keptRatio(60, 50), 1, 'affiché 100 % au plus');
});

test('champ de flux : contourne les obstacles, se recalcule quand un meuble casse', () => {
  const g = nightGame((s) => {
    s.shops.q1.layout.push({ id: 'comptoir', x: 0, y: 2 }, { id: 'comptoir', x: 1, y: 2 }, { id: 'comptoir', x: 2, y: 2 }, { id: 'comptoir', x: 3, y: 2 });
  });
  const { w } = g.grid;
  const f = g.fields.toRegister;
  const back = 0 * w + 1;
  // Mur en ligne 2 sauf la colonne 4 : la porte de derrière doit faire le tour par la droite.
  assert.ok(f[back] >= 7, `détour : ${f[back]}`);
  const wall = g.furn.find((x) => x.id === 'comptoir' && x.x === 1 && x.y === 2);
  initHp(wall);
  damageFurniture(g, wall, 1e6, 'test');
  assert.equal(wall.broken, true);
  assert.ok(g.fields.toRegister[back] < f[back] || g.fields.toRegister[back] <= 5, 'le meuble cassé est franchissable');
  wall.broken = false;
  computeFields(g);
});

function initHp(f) {
  f.maxHp = f.maxHp || 100;
  f.hp = f.hp || f.maxHp;
}

test('armure : max(1 ; dégâts − armure) ; feu, brûlure, poison et lumière l’ignorent', () => {
  assert.equal(armorReduce(6, 3, 'physical'), 3);
  assert.equal(armorReduce(2, 3, 'physical'), 1);
  assert.equal(armorReduce(2, 3, 'fire'), 2);
  assert.equal(armorReduce(7, 8, 'light'), 7);
  assert.equal(armorReduce(4, 8, 'poison'), 4);
  assert.equal(armorReduce(0, 0, 'physical'), 0);
  const gloubi = fakeMonster(MONSTERS.gloubi);
  assert.equal(damageMultiplier(gloubi, 'fire'), 1.5);
  gloubi.taggedT = 2;
  gloubi.tagAmt = 0.25;
  assert.ok(Math.abs(damageMultiplier(gloubi, 'fire', { bestiary: 0.03, assist: 0.15 }) - 1.5 * 1.25 * 1.03 * 1.15) < 1e-9);
});

test('ralentissements non cumulables : le plus fort s’applique, la durée se rafraîchit', () => {
  const m = fakeMonster(MONSTERS.raton);
  applySlow(m, 0.4, 1.5);
  applySlow(m, 0.25, 2);
  assert.equal(effectiveSlow(m), 0.4, 'le plus fort');
  assert.equal(m.slowT, 1.5);
  applySlow(m, 0.4, 1.5);
  m.slowT = 0.5;
  applySlow(m, 0.4, 1.5);
  assert.equal(m.slowT, 1.5, 'durée rafraîchie');
  applySlow(m, 0.5, 1);
  assert.equal(effectiveSlow(m), 0.5);
  m.auraSlow = 0.3;
  assert.equal(effectiveSlow(m), 0.5);
  const golem = fakeMonster(MONSTERS.golem);
  applySlow(golem, 0.4, 1, 'cold');
  assert.ok(Math.abs(effectiveSlow(golem) - 0.2) < 1e-9, 'froid ×0,5 sur le golem');
  const boss = fakeMonster(BOSSES.roi_raton);
  applySlow(boss, 0.4, 1);
  assert.ok(Math.abs(effectiveSlow(boss) - 0.2) < 1e-9, 'boss : contrôle ×0,5');
  applyStun(boss, 1.5);
  assert.equal(boss.stunT, 0.75);
  const ferr = fakeMonster(BOSSES.ferrailleur);
  applyStun(ferr, 1.5);
  assert.equal(ferr.stunT, 0, 'immunisé');
});

test('mise à l’échelle des PV et du butin (G10.2)', () => {
  const R = MONSTERS.raton.hp;
  assert.equal(scaledHp(MONSTERS.raton, 'q1', 1, 1), R);
  assert.ok(Math.abs(scaledHp(MONSTERS.raton, 'q2', 4, 2) - R * 2 * 1.36 * 1.35) < 1e-9);
  assert.ok(Math.abs(scaledHp(BOSSES.roi_raton, 'q1', 7, 3) - BOSSES.roi_raton.hp * 1.35 ** 2) < 1e-9);
  assert.equal(scaledLoot(MONSTERS.raton, 'q1', 1), 2);
  assert.equal(scaledLoot(MONSTERS.gourmand, 'q3', 2), Math.round(15 * 2.2 * 1.1));
});

test('nuit 1 complète : deux vagues, les meubles tirent, fin de nuit et étoiles', () => {
  const g = newGame(31);
  startNight(g, { dayTakings: 120 });
  assert.equal(g.night.tutorial, true);
  const ev = run(g, 60, () => {
    // Le marchand poursuit le voleur scénarisé.
    const thief = g.night && g.night.monsters.active.find((m) => m.thief);
    if (thief) teleport(g, thief.x, thief.y);
    else teleport(g, 2.5, 3.5);
  });
  assert.ok(count(ev, 'shot') + count(ev, 'lob') > 5, 'les meubles tirent');
  assert.equal(count(ev, 'wave_start'), 2);
  assert.equal(count(ev, 'thief_grab'), 1, 'le voleur scénarisé atteint la caisse');
  assert.equal(count(ev, 'thief_caught'), 1, 'rattrapé au balai');
  assert.equal(g.phase.name, 'dawn');
  const r = g.nightResult;
  assert.equal(r.kills, 7);
  assert.equal(r.stars, 3, 'le Bocal est complet (et même bonifié)');
  assert.equal(r.coins, r.jarFinal + r.loot);
});

test('voleur scénarisé : ralenti de moitié après 3 s sans réaction', () => {
  const g = newGame(31);
  startNight(g, { dayTakings: 120 });
  // M11 : la nuit scénarisée suit le rythme de G19 (vague 2 vers 2:08) : le vol arrive vers 28 s, on attend 45 s.
  let slowed = false;
  const ev = run(g, 45, () => {
    teleport(g, 4.5, 5.5);
    if (g.night && g.night.monsters.active.some((m) => m.slowedByScript)) slowed = true;
  });
  // Le voleur a eu le temps de fuir (le marchand ne bouge pas) : il a été ralenti.
  assert.ok(slowed, 'ralenti après 3 s sans réaction');
  // M11 (P2, Léa) : sur le seuil, il lâche son sac ; les pièces reviennent au Bocal, la première nuit reste à 3 étoiles.
  assert.equal(count(ev, 'bag_drop'), 1);
  assert.equal(count(ev, 'thief_escape'), 0);
  assert.equal(g.nightResult.stars, 3);
});

test('marchand : coup de balai, réparation d’un meuble cassé, Cloche', () => {
  const g = nightGame();
  const shelf = g.furn.find((f) => f.id === 'etagere');
  damageFurniture(g, shelf, 1e6, 'test');
  assert.equal(shelf.broken, true);
  teleport(g, 1.45, 4.5);
  run(g, 2.9, () => teleport(g, 1.45, 4.5));
  assert.equal(shelf.broken, true);
  run(g, 0.2, () => teleport(g, 1.45, 4.5));
  assert.equal(shelf.broken, false, 'revient en service après 3 s');
  assert.ok(Math.abs(shelf.hp - shelf.maxHp * 0.3) < shelf.maxHp * 0.05);
  const m = spawnMonster(g, 'raton', 'backdoor', { x: 2.5, y: 2.5 });
  m.entering = false;
  m.hp = m.maxHp = 1000;
  teleport(g, 2.5, 2.9);
  const ev = run(g, 0.1, () => teleport(g, m.x, m.y + 0.3));
  assert.equal(count(ev, 'broom'), 1);
  assert.ok(m.hp < 1000);
  assert.equal(ringBell(g), false, 'pas encore chargée');
  g.night.bellCharge = g.night.bellNeed;
  const hp = m.hp;
  assert.equal(ringBell(g), true);
  assert.ok(m.stunT >= 1.49);
  assert.equal(hp - m.hp, 15);
});

test('dégâts : multiplicateurs puis armure ; hérisson et lance-conserves', () => {
  const g = nightGame();
  const m = spawnMonster(g, 'herisson', 'backdoor', { x: 2.5, y: 1.5 });
  const shelf = g.furn.find((f) => f.id === 'etagere');
  const before = m.hp;
  dealDamage(g, m, 6, 'physical', shelf);
  assert.equal(before - m.hp, 3);
  finishNight(g, true);
  assert.equal(g.night.ended, true);
});

test('nuits d’apprentissage (Q1, nuits 2 et 3) : plus de Grignotins, et un voleur vedette que seul le marchand rattrape', async () => {
  const { generateNight } = await import('../../src/game/night/waves.js');
  const g = newGame(31, (s) => { s.shops.q1.night = 2; s.stats.nights = 1; s.stats.cycles = 1; });
  startNight(g, { dayTakings: 200 });
  assert.equal(g.night.learning, true);
  const stars = g.night.waves.flatMap((w) => w.groups).filter((x) => x.scriptedThief);
  assert.equal(stars.length, 1, 'un seul voleur vedette');
  const plain = generateNight({ seed: g.save.seed, districtId: 'q1', week: 1, night: 2, entrances: g.grid.entrances });
  const count2 = (w) => w.waves.reduce((a, x) => a + x.groups.reduce((b, y) => b + y.count, 0), 0);
  assert.ok(count2(g.night) > count2(plain), 'plus de Grignotins qu’une nuit 2 ordinaire');
  // Marchand immobile loin de tout : le voleur vedette s’échappe avec ses pièces (une étoile perdue), sans ralenti.
  let slowed = false;
  run(g, 120, () => {
    teleport(g, 4.5, 0.5);
    if (g.night && g.night.monsters.active.some((m) => m.slowedByScript)) slowed = true;
  });
  assert.equal(slowed, false, 'le ralenti n’aide que la nuit 1');
  assert.ok(g.nightResult.escaped >= 1);
  assert.ok(g.nightResult.stars <= 2, 'un marchand immobile perd une étoile');
  // La nuit 4 retrouve le rythme et le budget de G8.3.
  const g4 = newGame(31, (s) => { s.shops.q1.night = 4; s.stats.nights = 3; });
  startNight(g4, { dayTakings: 200 });
  assert.equal(g4.night.learning, false);
  assert.equal(g4.night.waves.flatMap((w) => w.groups).filter((x) => x.scriptedThief).length, 0);
});
