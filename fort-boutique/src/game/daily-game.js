// Fort Boutique — partie du Défi du jour (G13.3) : une boutique à part, construite sur une sauvegarde de travail (la
// vraie sauvegarde n'est jamais touchée par la nuit du défi). Mêmes règles pour tout le monde : marchand de base, sans
// Moka ni bonus du bestiaire, meubles imposés au niveau 5, PV des Grignotins ramenés à ceux du Quartier 1.
import { DAILY } from '../data/events.js';
import { DISTRICT_FACTORS } from '../data/balance.js';
import { defaultSave, defaultShop, cloneJson } from '../save/schema.js';
import { createGame, rebuildShop } from './state.js';
import { dailySetup, dailySeed } from './daily.js';
import { startNight } from './night/night.js';

/**
 * Prépare la partie du défi d'un jour UTC.
 * @param {any} save la vraie sauvegarde (lue seulement : réglages, apparence, Grignotins déjà vus)
 * @param {number} day
 */
export function createChallenge(save, day) {
  const setup = dailySetup(day);
  const s = defaultSave({ seed: dailySeed(day), now: 0, lang: save.settings.lang });
  s.settings = cloneJson(save.settings);
  s.cosmetics = cloneJson(save.cosmetics);
  s.collections.seenMonsters = save.collections.seenMonsters.slice();
  // Aucun indice du tutoriel pendant le défi.
  Object.assign(s.progress.flags, { introDone: true, firstChestDone: true });
  Object.assign(s.stats, { cycles: 99, nights: 99 });
  for (const id of setup.furniture) s.furniture[id] = { level: DAILY.furnitureLevel, plans: 0 };
  const shop = defaultShop(setup.district);
  Object.assign(shop, { unlocked: true, expansion: DAILY.expansion, layout: cloneJson(setup.layout), storage: [], week: 1, night: DAILY.night });
  s.shops = { [setup.district]: shop };
  s.currentShop = setup.district;
  const g = createGame({ save: s });
  g.challenge = { day, setup };
  return g;
}

/** Après l'aménagement libre : la nuit du défi commence (meubles éveillés, vagues fixes). */
export function startChallengeNight(g) {
  rebuildShop(g);
  for (const f of g.furn) f.eyes = 1;
  g.shop.phase.name = 'night';
  startNight(g, {
    waves: g.challenge.setup.waves,
    jar: DAILY.jar,
    challenge: true,
    mods: { hpMult: DAILY.hpMult / DISTRICT_FACTORS.hp[g.shopId] },
  });
}
