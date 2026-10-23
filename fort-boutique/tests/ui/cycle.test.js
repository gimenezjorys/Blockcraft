// M6 : deux cycles complets au doigt dans le build de test ; reprise exacte après rechargement (G5.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGame } from '../helpers/dom.js';
import { TouchBot } from '../helpers/bot.js';

/** Copie du localStorage d'une fenêtre (pour simuler un rechargement). */
function dumpStorage(g) {
  const ls = g.window.localStorage;
  const out = {};
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    out[k] = ls.getItem(k);
  }
  return out;
}

/** Joue jusqu'à ce que `pred(state)` soit vrai. */
function playUntil(g, bot, pred, maxMs = 400000) {
  for (let ms = 0; ms < maxMs; ms += 100) {
    const st = g.hooks.getState();
    if (pred(st)) return st;
    bot.tick(100);
  }
  throw new Error(`condition non atteinte : ${JSON.stringify(g.hooks.getState().scene && g.hooks.getState().scene.phase)}`);
}

test('deux cycles complets jouables au doigt (Matin -> Jour -> Nuit -> Aube -> Matin)', () => {
  const g = loadGame();
  try {
    const bot = new TouchBot(g);
    let st = playUntil(g, bot, (s) => s.scene && s.scene.phase === 'night');
    assert.ok(st.scene.padsDone.length >= 1, 'au moins un achat le jour 1');
    st = playUntil(g, bot, (s) => s.screen === 'dawn');
    assert.equal(st.scene.save.level, 2, 'niveau 2 à l’aube du cycle 1');
    st = playUntil(g, bot, (s) => s.scene.save.chestsOpened >= 1);
    assert.equal(st.scene.save.furniture.etagere.plans >= 2, true);
    st = playUntil(g, bot, (s) => s.scene.save.upgrades >= 1);
    assert.equal(st.scene.save.furniture.etagere.level, 2, 'première amélioration');
    st = playUntil(g, bot, (s) => s.screen === 'morning' || (s.scene && s.scene.phase === 'day' && s.scene.save.cycles === 1));
    st = playUntil(g, bot, (s) => s.scene.save.cycles >= 2 && s.screen === 'morning');
    assert.equal(st.scene.save.day, 3);
    assert.equal(st.scene.save.night, 3);
    assert.ok(st.scene.save.nights >= 2);
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('rechargement en pleine journée : même temps restant, même recette', async () => {
  const g = loadGame();
  let saved;
  let before;
  try {
    const bot = new TouchBot(g);
    playUntil(g, bot, (s) => s.scene && s.scene.phase === 'day' && s.scene.day.timeLeft < 60 && s.scene.day.takings > 0);
    bot.release();
    // Masquer l'onglet force l'écriture (B9).
    Object.defineProperty(g.document, 'hidden', { value: true, configurable: true });
    g.document.dispatchEvent(new g.window.Event('visibilitychange'));
    before = g.hooks.getState().scene;
    saved = dumpStorage(g);
  } finally {
    g.close();
  }
  const g2 = loadGame({ storage: saved });
  try {
    g2.fingers.tap(g2.$('.screen-title'), 180, 320);
    g2.hooks.advance(20);
    const st = g2.hooks.getState().scene;
    assert.equal(st.phase, 'day');
    assert.ok(Math.abs(st.day.timeLeft - before.day.timeLeft) < 0.2, `${st.day.timeLeft} vs ${before.day.timeLeft}`);
    assert.equal(st.day.takings, before.day.takings);
    // v1.1 : un Objectif de Mamie validé après le rechargement ajoute sa récompense (pièces) ; rien d'autre ne change.
    const { MAMIE } = await import('../../src/data/mamie.js');
    const bonus = MAMIE.q1.slice(before.mamie.q1 || 0, st.mamie.q1 || 0).reduce((a, o) => a + (o.reward.coins || 0), 0);
    assert.equal(st.coins, before.coins + before.day.pile + bonus, 'pièces conservées (le tas ramassé à la sauvegarde ou gardé)');
    assert.deepEqual(g2.errors, []);
  } finally {
    g2.close();
  }
});

test('rechargement pendant la nuit : la nuit recommence au début, avec les mêmes vagues', () => {
  const g = loadGame();
  let saved;
  let firstWave;
  try {
    const bot = new TouchBot(g);
    playUntil(g, bot, (s) => s.scene && s.scene.phase === 'night' && s.scene.night.monsters.length > 0);
    firstWave = g.hooks.getState().scene.night;
    saved = dumpStorage(g);
  } finally {
    g.close();
  }
  const g2 = loadGame({ storage: saved });
  try {
    g2.fingers.tap(g2.$('.screen-title'), 180, 320);
    g2.hooks.advance(20);
    const st = g2.hooks.getState().scene;
    assert.equal(st.phase, 'night');
    assert.equal(st.night.wave, 0, 'au début de la nuit');
    assert.equal(st.night.waves, firstWave.waves);
    assert.equal(st.night.jarInitial, firstWave.jarInitial, 'même Bocal');
    g2.hooks.advance(4000);
    const types = g2.hooks.getState().scene.night.monsters.map((m) => m.type);
    assert.ok(types.length > 0 && types.every((t) => t === 'raton'));
  } finally {
    g2.close();
  }
});

test('rechargement à l’aube : le ticket revient, les gains ne sont jamais rendus deux fois', () => {
  const g = loadGame();
  let saved;
  let coins;
  try {
    const bot = new TouchBot(g);
    playUntil(g, bot, (s) => s.screen === 'dawn');
    g.hooks.advance(500);
    coins = g.hooks.getState().scene.coins;
    saved = dumpStorage(g);
  } finally {
    g.close();
  }
  const g2 = loadGame({ storage: saved });
  try {
    g2.fingers.tap(g2.$('.screen-title'), 180, 320);
    g2.hooks.advance(100);
    const st = g2.hooks.getState();
    assert.equal(st.screen, 'dawn');
    assert.equal(st.scene.coins, coins, 'pas de double récompense');
    g2.hooks.advance(6000);
    assert.ok(g2.$('.dawn-chest') && !g2.$('.dawn-chest').hidden, 'le coffre attend toujours');
  } finally {
    g2.close();
  }
});

test('sauvegarde abîmée : message discret « Boutique réparée », la partie continue', () => {
  const g = loadGame();
  let saved;
  try {
    const bot = new TouchBot(g);
    playUntil(g, bot, (s) => s.scene && s.scene.padsDone.length >= 1);
    g.document.dispatchEvent(new g.window.Event('visibilitychange'));
    bot.release();
    g.hooks.advance(600);
    bot.tick(100);
    Object.defineProperty(g.document, 'hidden', { value: true, configurable: true });
    g.document.dispatchEvent(new g.window.Event('visibilitychange'));
    saved = dumpStorage(g);
  } finally {
    g.close();
  }
  assert.ok(saved['fortboutique.save.bak1'], 'une copie de secours existe');
  saved['fortboutique.save'] = saved['fortboutique.save'].replace('"coins":', '"coins":1');
  const g2 = loadGame({ storage: saved });
  try {
    g2.fingers.tap(g2.$('.screen-title'), 180, 320);
    g2.hooks.advance(50);
    const st = g2.hooks.getState();
    assert.ok(st.toasts.some((x) => /réparée/.test(x)), `toasts : ${st.toasts}`);
    assert.ok(st.scene.padsDone.length >= 1);
    assert.deepEqual(g2.errors, []);
  } finally {
    g2.close();
  }
});

test('stockage indisponible : le jeu tourne en mémoire, sans erreur', () => {
  for (const mode of ['throw', 'quota']) {
    const g = loadGame({ storageMode: mode });
    try {
      const bot = new TouchBot(g);
      playUntil(g, bot, (s) => s.scene && s.scene.phase === 'day' && s.scene.day.served >= 1);
      // Quota déjà plein : même la sonde d'écriture échoue, d'où le repli en mémoire dans les deux cas.
      assert.equal(g.hooks.getState().storageKind, 'memory');
      assert.deepEqual(g.errors, []);
    } finally {
      g.close();
    }
  }
});

test('aube : ruban de niveau après le coffre ; Matin : aucun bouton muet (P1)', () => {
  const g = loadGame();
  try {
    const bot = new TouchBot(g);
    playUntil(g, bot, (s) => s.screen === 'dawn');
    assert.ok(g.$('.dawn-level').hidden, 'le ruban attend la fin du coffre');
    assert.ok(g.$('.dawn-actions').hidden, 'pas de sortie avant le coffre');
    assert.ok(g.$('#dawn-double').hidden, 'pas de pub pendant les 10 premières minutes (G18.3)');
    playUntil(g, bot, (s) => s.scene.save.chestsOpened >= 1);
    // M11, G19 2:46 → 2:57 : les cartes sortent une à une, on améliore l’étagère, puis le ruban descend.
    g.hooks.advance(1000);
    const up = g.$$('.card-up').find((b) => !b.hidden);
    assert.ok(up, 'la flèche verte d’amélioration');
    assert.ok(g.$('.dawn-level').hidden, 'le ruban attend l’amélioration');
    bot.tapEl(up);
    g.hooks.advance(2500);
    const ribbon = g.$('.dawn-level');
    assert.equal(ribbon.hidden, false);
    assert.equal(ribbon.dataset.level, '2');
    assert.match(ribbon.textContent, /Niveau 2/);
    playUntil(g, bot, (s) => s.screen === 'morning');
    // Chaque bouton du hub répond : écran, ou refus visible (secousse) avec message pour ce qui arrive bientôt.
    for (const b of g.$$('.hub-grid .tag')) {
      bot.tapEl(b);
      g.hooks.advance(50);
      const st = g.hooks.getState();
      if (st.screen !== 'morning') break;
      assert.ok(b.classList.contains('nope'), `${b.id} répond`);
    }
    // La carte répond aussi (M9 : elle ouvre la carte des quartiers ; avant M9 elle disait « Bientôt »).
    if (g.$('.panel-back')) bot.tapEl('.panel-back');
    g.hooks.advance(300);
    assert.equal(g.hooks.getState().screen, 'morning');
    bot.tapEl(g.$('.hub-map'));
    g.hooks.advance(50);
    const answered = g.hooks.getState().screen === 'map' || g.hooks.getState().toasts.some((x) => /Bientôt/.test(x));
    assert.ok(answered, 'la carte répond (écran ou « Bientôt »)');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});

test('téléphone verrouillé en pleine journée : la pause s’ouvre et attend le joueur ; elle dit que tout est sauvegardé', () => {
  const g = loadGame();
  try {
    const bot = new TouchBot(g);
    playUntil(g, bot, (s) => s.scene && s.scene.phase === 'day');
    bot.release();
    const doc = g.document;
    const setHidden = (v) => {
      Object.defineProperty(doc, 'hidden', { value: v, configurable: true });
      Object.defineProperty(doc, 'visibilityState', { value: v ? 'hidden' : 'visible', configurable: true });
      doc.dispatchEvent(new g.window.Event('visibilitychange'));
    };
    setHidden(true);
    setHidden(false);
    g.hooks.advance(500);
    assert.ok(g.$('#pause-resume'), 'la pause est ouverte au retour');
    const t0 = g.hooks.getState().scene.day.timeLeft;
    g.hooks.advance(2000);
    assert.equal(g.hooks.getState().scene.day.timeLeft, t0, 'le temps ne file pas tant que le joueur n’a pas repris');
    assert.match(g.$('.pause-saved').textContent, /sauvegardée/);
    // v0.2 : Paramètres existe (avant : « Bientôt ») ; on l'ouvre puis on revient à la pause, toujours en pause.
    bot.tapEl('#pause-settings');
    g.hooks.advance(50);
    assert.equal(g.hooks.getState().screen, 'settings', 'Paramètres s’ouvre depuis la pause');
    bot.tapEl('#settings-close');
    g.hooks.advance(50);
    assert.equal(g.hooks.getState().scene.day.timeLeft, t0, 'toujours en pause');
    bot.tapEl('#pause-resume');
    g.hooks.advance(500);
    assert.ok(g.hooks.getState().scene.day.timeLeft < t0, 'le jeu repart');
    assert.deepEqual(g.errors, []);
  } finally {
    g.close();
  }
});
