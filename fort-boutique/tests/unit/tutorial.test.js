// M11 : les 10 premières minutes (G19) — objectif toujours visible (G3.5) et indices sans texte (règle des 4 s).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, teleport, DT } from '../helpers/game.js';
import { stepGame } from '../../src/game/phases.js';
import { startDay } from '../../src/game/day/day.js';
import { startNight } from '../../src/game/night/night.js';
import { nextObjective, objectiveKey } from '../../src/game/objectives.js';
import { stepHints, hintsActive, forceArrow, learned } from '../../src/game/tutorial.js';
import { HINTS } from '../../src/data/tutorial.js';

/** Avance avec les indices, comme la scène de jeu (stepGame puis stepHints, avant de vider la file). */
function play(g, sec, onStep) {
  const n = Math.round(sec / DT);
  for (let i = 0; i < n; i++) {
    if (onStep) onStep(g);
    stepGame(g, DT);
    stepHints(g, DT);
    g.events.clear();
  }
}

const still = (g) => {
  g.input.x = 0;
  g.input.y = 0;
};

test('objectif (G3.5) : l’emplacement d’achat passe en premier, avec le montant restant et sa barre', () => {
  const g = newGame();
  startDay(g);
  // Avant la première vente, l’étiquette montre déjà P1 (40) : ce que rapportent les premières pièces.
  let o = nextObjective(g);
  assert.equal(o.kind, 'pad');
  assert.equal(o.id, 'P1');
  assert.equal(o.furniture, 'etagere');
  assert.equal(o.remaining, 40);
  assert.equal(o.onFloor, false);
  g.save.player.coins = 10;
  assert.equal(nextObjective(g).progress, 0.25);
  // Au sol : montant restant et case.
  g.shop.phase.firstSaleDone = true;
  play(g, 0.1, still);
  o = nextObjective(g);
  assert.equal(o.onFloor, true);
  assert.deepEqual(o.cell, { x: g.day.pad.x, y: g.day.pad.y });
  g.day.pad.paid = 30;
  assert.equal(nextObjective(g).remaining, 10);
  assert.notEqual(objectiveKey(nextObjective(g)), objectiveKey(o), 'la clé change avec le montant');
});

test('objectif : P3 attend le jour 2 et le niveau 2 ; on montre alors le déblocage du niveau 2 (le Frigo)', () => {
  const g = newGame(11, (s) => { s.shops.q1.pads.done = ['P1', 'P2']; });
  const o = nextObjective(g);
  assert.equal(o.kind, 'unlock');
  assert.equal(o.level, 2);
  assert.equal(o.furniture, 'frigo', 'un nouveau produit passe avant un meuble générique');
  g.save.player.xp = 60;
  assert.equal(nextObjective(g).progress, 0.5);
});

test('objectif : amélioration prête, puis quête presque finie, puis Pleine Lune', () => {
  const g = newGame(11, (s) => {
    s.shops.q1.pads.done = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
    s.furniture.etagere.plans = 2;
    s.player.coins = 30;
  });
  let o = nextObjective(g);
  assert.equal(o.kind, 'upgrade');
  assert.equal(o.furniture, 'etagere');
  g.save.player.coins = 0;
  g.save.daily.quests.list = [{ id: 'sell', goal: 10, progress: 9, claimed: false }, { id: 'kill', goal: 10, progress: 5 }];
  o = nextObjective(g);
  assert.equal(o.kind, 'quest');
  assert.equal(o.id, 'sell');
  g.save.daily.quests.list = [];
  assert.equal(nextObjective(g).kind, 'unlock');
  g.save.player.level = 40;
  o = nextObjective(g);
  assert.equal(o.kind, 'moon');
  assert.equal(o.nights, 7, 'nuit 1 : la Pleine Lune dans 7 nuits (elle comprise)');
});

test('jour 1 : la main fantôme montre le geste tout de suite, la flèche dorée mène à la cagette', () => {
  const g = newGame();
  startDay(g);
  play(g, 3, still);
  assert.ok(g.hints.hand, 'main fantôme dès le début (G19 0:06)');
  assert.equal(g.hints.arrow.color, 'gold');
  const crate = g.furn.find((f) => f.id === 'cagette');
  const t = g.hints.arrow;
  assert.ok(Math.abs(t.tx - ((crate.access % g.grid.w) + 0.5)) < 1e-9, 'la flèche vise la case devant la cagette');
  // Le joueur bouge : la main disparaît, le guide reste.
  play(g, 0.3, (gg) => { gg.input.x = -1; gg.input.y = 0; });
  assert.equal(learned(g.save).move, true);
  play(g, 0.1, still);
  assert.equal(g.hints.hand, null);
  assert.ok(g.hints.arrow, 'la flèche continue de guider');
});

test('jour 1 : après la prise, la flèche passe sur l’étagère ; la main ne revient qu’après 4 s sans rien faire', () => {
  const g = newGame();
  startDay(g);
  learned(g.save).move = true;
  const crate = g.furn.find((f) => f.id === 'cagette');
  crate.stock = 4;
  const ax = (crate.access % g.grid.w) + 0.5;
  const ay = ((crate.access / g.grid.w) | 0) + 0.5;
  play(g, 1.5, (gg) => teleport(gg, ax, ay));
  // Un petit pas : le compteur d’inaction repart de zéro.
  play(g, 0.1, (gg) => { gg.input.x = 0.2; gg.input.y = 0; });
  assert.ok(g.player.stack.length > 0);
  assert.equal(learned(g.save).pick, true);
  const shelf = g.furn.find((f) => f.id === 'etagere');
  assert.ok(Math.abs(g.hints.arrow.tx - ((shelf.access % g.grid.w) + 0.5)) < 1e-9, 'flèche vers l’étagère (G19 0:13)');
  play(g, HINTS.delayS - 1, still);
  assert.equal(g.hints.hand, null, 'pas de main avant 4 s');
  play(g, 1.2, still);
  assert.ok(g.hints.hand, 'main fantôme après 4 s sans l’action attendue');
});

test('après le guide : aucun indice tant que le joueur agit ; un indice utile après 4 s d’inaction', () => {
  const g = newGame(11, (s) => { s.stats.cycles = 1; s.shops.q1.day = 2; });
  startDay(g);
  const shelf = g.furn.find((f) => f.id === 'etagere');
  shelf.count = 0;
  const crate = g.furn.find((f) => f.id === 'cagette');
  crate.stock = 3;
  play(g, 2, (gg) => { gg.input.x = 0.3; gg.input.y = 0; });
  assert.equal(g.hints.arrow, null, 'le joueur agit : rien');
  play(g, HINTS.delayS + 0.2, still);
  assert.ok(g.hints.arrow && g.hints.hand, 'indice après 4 s');
});

test('les indices s’arrêtent après les 10 premières minutes (3 cycles) ; un tap sur l’objectif montre l’emplacement', () => {
  const g = newGame(11, (s) => { s.stats.cycles = 3; s.shops.q1.day = 4; s.shops.q1.phase.firstSaleDone = true; });
  assert.equal(hintsActive(g.save), false);
  startDay(g);
  play(g, 6, still);
  assert.equal(g.hints.arrow, null);
  assert.equal(g.hints.hand, null);
  assert.ok(g.day.pad, 'un emplacement est au sol');
  forceArrow(g);
  play(g, 0.1, still);
  assert.ok(g.hints.arrow, 'flèche vers l’emplacement après un tap sur l’étiquette');
  play(g, HINTS.forcedArrowS + 0.2, still);
  assert.equal(g.hints.arrow, null, 'elle s’efface ensuite');
});

test('nuit 1 : main fantôme si le marchand reste immobile 4 s loin des meubles ; traînée rouge vers le voleur après 3 s', () => {
  const g = newGame(31);
  for (const f of g.furn) f.eyes = 1;
  startNight(g, { dayTakings: 120 });
  learned(g.save).move = true;
  let hand = false;
  let red = false;
  let redBeforeGrace = false;
  let stoleAt = -1;
  const n = Math.round(45 / DT);
  for (let i = 0; i < n && !g.night.ended; i++) {
    // Coin en haut à droite : à plus de 1,6 case de tous les meubles (hors de l’aura).
    teleport(g, 4.5, 0.5);
    stepGame(g, DT);
    for (let k = 0; k < g.events.length; k++) if (g.events.items[k].type === 'thief_grab' && stoleAt < 0) stoleAt = g.night.t;
    stepHints(g, DT);
    g.events.clear();
    if (g.hints.hand && !(g.hints.arrow && g.hints.arrow.color === 'red')) hand = true;
    if (g.hints.arrow && g.hints.arrow.color === 'red') {
      red = true;
      if (stoleAt >= 0 && g.night.t - stoleAt < HINTS.thiefDelayS - 0.1) redBeforeGrace = true;
    }
  }
  assert.ok(hand, 'main fantôme vers un meuble (aura du marchand)');
  assert.ok(stoleAt >= 0, 'un voleur prend des pièces');
  assert.ok(red, 'traînée rouge vers le voleur');
  assert.equal(redBeforeGrace, false, 'pas avant 3 s');
});

test('objectif selon la phase : au Matin, l’amélioration prête passe d’abord ; pendant le Jour, jamais d’amélioration', () => {
  const g = newGame(11, (s) => {
    s.shops.q1.pads.done = ['P1', 'P2'];
    s.shops.q1.day = 2;
    s.player.level = 2;
    s.furniture.etagere.plans = 2;
    s.player.coins = 30;
  });
  g.phase = { name: 'morning', t: 0 };
  assert.equal(nextObjective(g).kind, 'upgrade', 'Matin : elle se fait là, tout de suite');
  startDay(g);
  const o = nextObjective(g);
  assert.equal(o.kind, 'pad', 'Jour : le Frigo à payer');
  g.shop.pads.done = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  assert.notEqual(nextObjective(g).kind, 'upgrade', 'Jour : pas d’objectif impossible');
});

test('un passage de niveau en attente ne bloque pas l’emplacement du Frigo (niveau 2) pendant le jour 2', () => {
  const g = newGame(11, (s) => {
    s.shops.q1.pads.done = ['P1', 'P2'];
    s.shops.q1.day = 2;
    s.stats.cycles = 1;
    s.shops.q1.phase.firstSaleDone = true;
  });
  startDay(g);
  play(g, 0.2, still);
  assert.equal(g.day.pad, null, 'niveau 1, XP 0 : pas encore');
  g.save.player.xp = 125;
  play(g, 0.2, still);
  assert.equal(g.save.player.level, 1, 'le niveau attend l’aube');
  assert.ok(g.day.pad && g.day.pad.id === 'P3', 'mais l’emplacement apparaît');
});

test('objectif « niveau » : quand l’XP du jour a déjà franchi le palier, la barre vise le palier suivant (P2, Sam)', () => {
  const g = newGame(11, (s) => {
    s.shops.q1.pads.done = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
    s.shops.q1.day = 3;
    s.player.level = 3;
  });
  startDay(g);
  g.save.player.xp = 100;
  let o = nextObjective(g);
  assert.equal(o.kind, 'unlock');
  assert.equal(o.level, 4);
  assert.equal(o.progress, 0.5);
  // 230 XP au niveau 3 : le niveau 4 est acquis (fêté à l’aube) ; la barre continue vers le niveau 5.
  g.save.player.xp = 230;
  o = nextObjective(g);
  assert.equal(g.save.player.level, 3);
  assert.equal(o.level, 5);
  assert.ok(o.progress > 0 && o.progress < 1, `${o.progress}`);
});
