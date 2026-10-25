// Fort Boutique — Playtest P3 « retour le lendemain » (D3.5) : une partie de 10 minutes (robot au rythme humain), puis
// trois retours indépendants à +1, +3 et +8 jours (horloge simulée). On note ce que le joueur voit en revenant
// (ticket d'absence, calendrier, flamme, quêtes, défi, événement), ce qu'il gagne, et le temps avant de rejouer.
import { loadGame } from '../../tests/helpers/dom.js';
import { HumanBot } from './human-bot.mjs';
import { parseAndVerify, SAVE_KEY } from '../../src/save/save.js';

const DAY = 86400000;

const dump = (g) => {
  const ls = g.window.localStorage;
  const out = {};
  for (let i = 0; i < ls.length; i++) out[ls.key(i)] = ls.getItem(ls.key(i));
  return out;
};
const saveOf = (storage) => parseAndVerify(storage[SAVE_KEY]).data;

/** Première partie : 10 minutes comme P2. */
function firstSession() {
  const g = loadGame();
  try {
    const bot = new HumanBot(g);
    for (let ms = 0; ms < 10 * 60 * 1000; ms += 100) bot.tick(100);
    // On quitte au Matin suivant (comme on ferme l'onglet) : la sauvegarde est écrite.
    for (let ms = 0; ms < 4 * 60 * 1000 && g.hooks.getState().screen !== 'morning'; ms += 100) bot.tick(100);
    g.hooks.advance(1500);
    return { storage: dump(g), errors: g.errors.slice() };
  } finally {
    g.close();
  }
}

/** Un retour après `days` jours : 5 minutes de jeu, avec le relevé de ce qui s'affiche. */
function comeBack(storage, days) {
  const before = saveOf(storage);
  const now = before.lastSeenAt + days * DAY;
  const g = loadGame({ storage, now });
  const screens = [];
  const toasts = new Set();
  let firstOpenAt = null;
  let cur = '';
  let reliefOffered = false;
  try {
    const bot = new HumanBot(g);
    for (let ms = 0; ms < 5 * 60 * 1000; ms += 100) {
      bot.tick(100);
      const st = g.hooks.getState();
      if (st.screen !== cur) {
        cur = st.screen;
        screens.push({ screen: cur, at: Math.round(ms / 100) / 10 });
      }
      for (const x of st.toasts || []) toasts.add(x);
      if (g.$('#streak-relight')) reliefOffered = true;
      if (firstOpenAt === null && st.scene && st.scene.phase === 'day') firstOpenAt = Math.round(ms / 100) / 10;
    }
    g.hooks.advance(1500);
    const after = saveOf(dump(g));
    return {
      days,
      screens: screens.slice(0, 14),
      toasts: [...toasts],
      firstOpenAt,
      coins: [before.player.coins, after.player.coins],
      rubies: [before.player.rubies, after.player.rubies],
      level: [before.player.level, after.player.level],
      streak: { before: before.daily.streak.count, after: after.daily.streak.count, brokenCount: after.daily.streak.brokenCount, freezes: after.daily.streak.freezes },
      calendar: [before.daily.calendarIndex, after.daily.calendarIndex],
      welcome: after.offline.welcomeChestForDay !== before.offline.welcomeChestForDay,
      reliefOffered,
      quests: after.daily.quests.list.length,
      errors: g.errors.slice(),
    };
  } finally {
    g.close();
  }
}

export function runP3() {
  const first = firstSession();
  const s0 = saveOf(first.storage);
  const returns = [1, 3, 8].map((d) => comeBack(first.storage, d));
  return {
    start: { level: s0.player.level, day: s0.shops.q1.day, coins: s0.player.coins, streak: s0.daily.streak.count, calendar: s0.daily.calendarIndex },
    returns,
    errors: [...first.errors, ...returns.flatMap((r) => r.errors)],
  };
}

export function toMarkdownP3(r) {
  const L = ['# Playtest P3 — mesures (retour le lendemain)', ''];
  L.push(`Après 10 minutes : niveau ${r.start.level}, jour ${r.start.day}, ${r.start.coins} pièces, série ${r.start.streak}, calendrier ${r.start.calendar} réclamé(s).`, '');
  L.push('| Retour | Écrans dans l’ordre (s) | Rejoue (OUVRIR) | Pièces | Rubis | Niveau | Flamme (avant → après) | Calendrier | Coffre de Bienvenue | Rallumer proposé |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const x of r.returns) {
    const sc = x.screens.map((s) => `${s.screen} ${s.at}`).join(' → ');
    L.push(`| +${x.days} j | ${sc} | ${x.firstOpenAt ?? '—'} s | ${x.coins[0]} → ${x.coins[1]} | ${x.rubies[0]} → ${x.rubies[1]} | ${x.level[0]} → ${x.level[1]} | ${x.streak.before} → ${x.streak.after} (éteinte à ${x.streak.brokenCount}, gels ${x.streak.freezes}) | ${x.calendar[0]} → ${x.calendar[1]} | ${x.welcome ? 'oui' : 'non'} | ${x.reliefOffered ? 'oui' : 'non'} |`);
  }
  L.push('', 'Messages vus :', '');
  for (const x of r.returns) L.push(`- +${x.days} j : ${x.toasts.join(' · ') || '—'}`);
  L.push('', `Erreurs JavaScript : ${r.errors.length}`);
  return L.join('\n') + '\n';
}
