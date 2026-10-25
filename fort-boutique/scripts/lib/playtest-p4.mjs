// Fort Boutique — Playtest P4 « joueur avancé » (D3.5) : une sauvegarde de niveau 25 avec 4 quartiers (fabriquée par le
// simulateur avec le robot Moyen), puis 10 cycles joués au doigt dans le vrai jeu (robot au rythme humain, B15). On
// note la durée des cycles, les étoiles, le Bocal, les écrans vus, les messages, ce qui est proposé (Nuit sans fin,
// Franchise, pubs) et les erreurs.
import { loadGame, calendarDoneToday, TEST_NOW } from '../../tests/helpers/dom.js';
import { HumanBot } from './human-bot.mjs';
import { serialize, parseAndVerify, SAVE_KEY } from '../../src/save/save.js';
import { simulateGame } from './sim-engine.mjs';

const FOUR = ['q1', 'q2', 'q3', 'q4'];

/** Sauvegarde « joueur avancé » : niveau 25, quatre quartiers ouverts. */
export function advancedSave() {
  for (let seed = 1000; seed < 1012; seed++) {
    // Le robot Moyen joue jusqu'au Q4 (il n'entre pas au Q5) ; on garde sa partie dès le niveau 25.
    const r = simulateGame({
      seed,
      profile: 'medium',
      maxCycles: 80,
      through: 'q4',
      stopAfterBoss: false,
      until: (s) => s.player.level >= 25 && FOUR.every((id) => s.shops[id] && s.shops[id].unlocked),
    });
    if (r.save) return { save: r.save, seed, cycles: r.cycles.length };
  }
  throw new Error('aucune partie du robot Moyen n’atteint le niveau 25 avec 4 quartiers en 80 cycles');
}

const saveOf = (g) => parseAndVerify(g.window.localStorage.getItem(SAVE_KEY)).data;

export function runP4() {
  const made = advancedSave();
  const s = made.save;
  s.lastSeenAt = TEST_NOW - 60000;
  const g = loadGame({ storage: { [SAVE_KEY]: serialize(calendarDoneToday(s)) } });
  const cycles = [];
  const screens = {};
  const toasts = new Set();
  let cur = '';
  let curAt = 0;
  let cycleStart = 0;
  let mapSeen = null;
  const start = { level: s.player.level, coins: s.player.coins, shop: s.currentShop, shops: FOUR.filter((id) => s.shops[id].unlocked), cycles: made.cycles, seed: made.seed };
  try {
    const bot = new HumanBot(g);
    let shopped = -1;
    const purchases = { upgrades: 0, furniture: 0 };
    /** Un joueur avancé fait ses achats au Matin, au doigt : améliorations abordables (tous les onglets), puis meubles. */
    const shop = () => {
      const tapAll = (sel, max) => {
        let n = 0;
        for (let k = 0; k < max; k++) {
          const el = g.$$(sel).find((x) => !x.classList.contains('disabled'));
          if (!el) break;
          bot.tapEl(el);
          g.hooks.advance(150);
          n++;
        }
        return n;
      };
      if (g.$('#hub-upgrades') && !g.$('#hub-upgrades').classList.contains('locked')) {
        bot.tapEl('#hub-upgrades');
        g.hooks.advance(300);
        for (const tab of g.$$('.panel-filters .tag')) {
          bot.tapEl(tab);
          g.hooks.advance(150);
          purchases.upgrades += tapAll('.up-row .tag[data-variant="green"]', 6);
        }
        bot.tapEl('.panel-back');
        g.hooks.advance(300);
      }
      if (g.$('#hub-catalog') && !g.$('#hub-catalog').classList.contains('locked')) {
        bot.tapEl('#hub-catalog');
        g.hooks.advance(300);
        purchases.furniture += tapAll('.cat-card:not(.locked):not(.maxed) .cat-price:not(.short)', 4);
        // tapAll vise le prix : on remonte à la carte pour le tap.
        bot.tapEl('.panel-back');
        g.hooks.advance(300);
      }
    };
    // Premier Matin : un joueur avancé regarde la carte (Nuit sans fin, Franchise) avant d'ouvrir.
    bot.onMorning = (b) => {
      if (mapSeen && shopped === cycles.length) return true;
      if (mapSeen && b.screenT >= 1500) {
        shop();
        shopped = cycles.length;
        return false;
      }
      if (b.state().screen === 'morning' && b.screenT >= 1500) {
        b.tapEl('.hub-map');
        g.hooks.advance(300);
        mapSeen = {
          endless: !!g.$('#map-endless'),
          franchise: g.$$('[id^="map-franchise-"]').map((x) => x.id.replace('map-franchise-', '')),
          open: g.$$('.map-facade').filter((f) => f.dataset.status === 'open' || f.dataset.status === 'here').map((f) => f.dataset.district),
        };
        b.tapEl('.panel-back');
        g.hooks.advance(300);
      }
      return false;
    };
    let ms = 0;
    const LIMIT = 90 * 60 * 1000;
    while (cycles.length < 10 && ms < LIMIT) {
      bot.tick(100);
      ms += 100;
      const st = g.hooks.getState();
      if (st.screen !== cur) {
        if (cur) screens[cur] = (screens[cur] || 0) + (ms - curAt);
        if (st.screen === 'dawn') {
          const sv = saveOf(g);
          const shop = sv.shops[sv.currentShop];
          const r = shop.phase.dawn && shop.phase.dawn.result;
          cycles.push({ ms: ms - cycleStart, shop: sv.currentShop, week: shop.week, night: shop.night, stars: r ? r.stars : null, kept: r ? Math.round(r.kept * 100) : null, boss: r ? !!r.bossNight : false, bossWin: r ? !!r.bossWin : false, coins: sv.player.coins, level: sv.player.level });
          cycleStart = ms;
        }
        cur = st.screen;
        curAt = ms;
      }
      for (const x of st.toasts || []) toasts.add(x);
    }
    g.hooks.advance(1500);
    const after = saveOf(g);
    return {
      start,
      cycles,
      minutes: Math.round(ms / 600) / 100,
      screens: Object.fromEntries(Object.entries(screens).map(([k, v]) => [k, Math.round(v / 100) / 10])),
      toasts: [...toasts],
      map: mapSeen,
      purchases,
      end: { level: after.player.level, coins: after.player.coins, rubies: after.player.rubies, endlessBest: after.endless.best },
      errors: g.errors.slice(),
    };
  } finally {
    g.close();
  }
}

export function toMarkdownP4(r) {
  const L = ['# Playtest P4 — mesures (joueur avancé)', ''];
  L.push(`Sauvegarde du robot Moyen (graine ${r.start.seed}, ${r.start.cycles} cycles) : niveau ${r.start.level}, ${r.start.coins} pièces, boutique ${r.start.shop}, quartiers ouverts ${r.start.shops.join(', ')}.`, '');
  if (r.map) L.push(`Carte au premier Matin : quartiers ouverts ${r.map.open.join(', ')} ; Nuit sans fin ${r.map.endless ? 'proposée' : 'absente'} ; Franchiser proposé pour ${r.map.franchise.join(', ') || 'aucune boutique'}.`, '');
  L.push('| Cycle | Durée (s) | Boutique | Semaine / nuit | Pleine Lune | Étoiles | Bocal gardé | Pièces | Niveau |', '|---|---|---|---|---|---|---|---|---|');
  r.cycles.forEach((c, i) => L.push(`| ${i + 1} | ${Math.round(c.ms / 1000)} | ${c.shop} | ${c.week} / ${c.night} | ${c.boss ? (c.bossWin ? 'gagnée' : 'perdue') : '—'} | ${c.stars ?? '—'} | ${c.kept ?? '—'} % | ${c.coins} | ${c.level} |`));
  L.push('', `Durée totale : ${r.minutes} min. Fin : niveau ${r.end.level}, ${r.end.coins} pièces, ${r.end.rubies} rubis.`, '');
  L.push(`Achats au doigt pendant les 10 cycles : ${r.purchases.upgrades} améliorations, ${r.purchases.furniture} meubles.`, '');
  L.push('Temps par écran (s) : ' + Object.entries(r.screens).map(([k, v]) => `${k} ${v}`).join(' · '), '');
  L.push('Messages vus : ' + (r.toasts.join(' · ') || '—'), '');
  L.push(`Erreurs JavaScript : ${r.errors.length}`);
  return L.join('\n') + '\n';
}
