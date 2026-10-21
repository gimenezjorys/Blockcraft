// Fort Boutique — moteur des simulations d'équilibrage (D2) : une partie complète sur la logique pure, sans DOM,
// avec le même enchaînement que la session (Matin -> Jour -> Crépuscule -> Nuit -> Aube -> Matin).
import { defaultSave } from '../../src/save/schema.js';
import { createGame, rebuildShop } from '../../src/game/state.js';
import { stepGame } from '../../src/game/phases.js';
import { openShop, markNightPending, enterDawn, openDawnChest, leaveDawn } from '../../src/game/cycle.js';
import { catalogIds, canBuy } from '../../src/game/catalog.js';
import { canUpgrade } from '../../src/game/economy.js';
import { unlockedFurniture, districtOpen } from '../../src/game/progression.js';
import { DISTRICTS } from '../../src/data/districts.js';
import { createPilot, PROFILES } from './bots.mjs';
import { morningActions } from './strategy.mjs';
import { applyQuestModel } from './quests-model.mjs';
import { findPlacement } from '../../src/game/catalog.js';

export const SIM_DT = 1 / 60;

import * as WAVES_DATA from '../../src/data/waves.js';
import * as MONSTER_DATA from '../../src/data/monsters.js';
import * as BALANCE from '../../src/data/balance.js';
import * as NIGHT_DATA from '../../src/data/night.js';
import * as XP_DATA from '../../src/data/xp.js';
import * as FURN_DATA from '../../src/data/furniture.js';
import * as CHEST_DATA from '../../src/data/chests.js';
import * as TUTO_DATA from '../../src/data/tutorial.js';
import * as MERCHANT_DATA from '../../src/data/merchant.js';
import { EVENTS_SWITCH } from '../../src/game/weekly-events.js';

// L'équilibrage se mesure sans événement de la semaine ni saison (D2, DECISIONS.md M14).
EVENTS_SWITCH.enabled = false;

const REGISTRY = {
  WAVES: WAVES_DATA.WAVES, SCALING: WAVES_DATA.SCALING, MONSTERS: MONSTER_DATA.MONSTERS, BOSSES: MONSTER_DATA.BOSSES,
  CUSTOMERS: BALANCE.CUSTOMERS, ECONOMY: BALANCE.ECONOMY, DAY: BALANCE.DAY, NIGHT: NIGHT_DATA.NIGHT, XP_GAINS: XP_DATA.XP_GAINS,
  FURNITURE: FURN_DATA.FURNITURE, FURNITURE_LEVEL: BALANCE.FURNITURE_LEVEL, CHESTS: CHEST_DATA.CHESTS,
  RUSH: TUTO_DATA.RUSH, SPECIAL_ORDER: TUTO_DATA.SPECIAL_ORDER, XP_TABLE: XP_DATA.XP_TABLE, CAT: MERCHANT_DATA.CAT,
};

/**
 * Essai de réglage sans toucher aux fichiers : { 'WAVES.budgetBase': 6, 'MONSTERS.raton.hp': 30, 'FURNITURE.*.night.dmg': '*0.9' }.
 * Une valeur « *k » multiplie la valeur actuelle ; « * » dans le chemin vise toutes les clés du niveau.
 */
export function applyOverrides(map) {
  for (const [path, value] of Object.entries(map || {})) {
    const parts = path.split('.');
    const walk = (obj, i) => {
      if (obj === undefined || obj === null) return;
      const k = parts[i];
      const keys = k === '*' ? Object.keys(obj) : [k];
      for (const key of keys) {
        if (i === parts.length - 1) {
          if (typeof value === 'string' && value.startsWith('*')) {
            if (typeof obj[key] === 'number') obj[key] *= Number(value.slice(1));
            else if (Array.isArray(obj[key])) obj[key] = obj[key].map((x) => x * Number(value.slice(1)));
          } else obj[key] = value;
        } else walk(obj[key], i + 1);
      }
    };
    walk(REGISTRY[parts[0]], 1);
  }
}

/** Achat « utile » le moins cher accessible (catalogue ou amélioration de meuble), en pièces ; Infinity sinon. */
export function cheapestUseful(save, shopId) {
  let best = Infinity;
  const shop = save.shops[shopId];
  for (const id of catalogIds(shopId)) {
    const c = canBuy(save, shopId, id);
    if (!(c.ok || c.reason === 'coins') || c.price >= best) continue;
    // Un meuble sans place libre n'est pas un achat utile.
    if (findPlacement(shopId, shop.expansion, shop.layout, id)) best = c.price;
  }
  for (const id of unlockedFurniture(save)) {
    if (id === 'caisse') continue;
    const u = canUpgrade(save, id);
    if (u.ok || u.reason === 'coins') best = Math.min(best, u.cost.coins);
  }
  return best;
}

/**
 * Joue une partie.
 * @param {{ seed: number, profile: string, maxCycles?: number, stopAfterBoss?: boolean }} o
 */
export function simulateGame(o) {
  const profile = PROFILES[o.profile];
  const save = defaultSave({ seed: o.seed, now: 0, lang: 'fr' });
  save.progress.flags.introDone = true;
  const g = createGame({ save });
  const pilot = createPilot(profile, o.seed);
  const maxCycles = o.maxCycles ?? 30;
  const cycles = [];
  const out = { seed: o.seed, profile: o.profile, cycles, bossWonAt: null, bossAttempts: 0, nextLevelAt: null, steps: 0 };
  const nextDistrict = Object.keys(DISTRICTS).find((id) => DISTRICTS[id].previousBoss === 'q1');
  for (let c = 1; c <= maxCycles; c++) {
    const startCoins = save.player.coins;
    openShop(g);
    let dayS = 0;
    let nightS = 0;
    let guard = 0;
    for (;;) {
      pilot.tick(g, SIM_DT);
      if (o.trace) o.trace(g, c, pilot);
      const ph = g.phase.name;
      stepGame(g, SIM_DT);
      out.steps++;
      if (ph === 'day' || ph === 'closing') dayS += SIM_DT;
      else if (ph === 'night') nightS += SIM_DT;
      let dawn = false;
      for (let i = 0; i < g.events.length; i++) {
        const e = g.events.items[i];
        if (e.type === 'day_end') markNightPending(g);
        else if (e.type === 'dawn') dawn = true;
      }
      g.events.clear();
      if (dawn) break;
      if (++guard > 60 * 60 * 30) throw new Error(`cycle ${c} bloqué (phase ${g.phase.name})`);
    }
    const r = g.nightResult;
    const dr = g.dayResult || {};
    const nightK = g.shop.night;
    const nightWeek = g.shop.week;
    const dayCoins = save.player.coins - startCoins;
    enterDawn(g);
    openDawnChest(g);
    if (r.bossNight) out.bossAttempts++;
    leaveDawn(g);
    rebuildShop(g);
    const quests = o.quests === false ? 0 : applyQuestModel(g, o.profile, c);
    const coinsBefore = save.player.coins;
    const usefulBefore = cheapestUseful(save, g.shopId);
    const acts = morningActions(g, profile, { cycle: c, seed: o.seed });
    rebuildShop(g);
    const useful = cheapestUseful(save, g.shopId);
    cycles.push({
      cycle: c,
      level: save.player.level,
      xp: save.player.xp,
      coins: save.player.coins,
      earned: dayCoins + r.coins,
      stars: r.stars,
      kept: r.kept,
      bossNight: !!r.bossNight,
      bossWin: !!r.bossWin,
      dayS,
      nightS,
      kills: r.kills,
      served: dr.served || 0,
      sold: dr.sold || 0,
      lostCustomers: dr.lost || 0,
      sales: dr.sales || 0,
      thefts: r.thefts,
      escaped: r.escaped,
      bought: acts.bought.length,
      upgraded: acts.upgraded.length,
      moved: acts.moved,
      useful,
      coinsBefore,
      usefulBefore,
      quests,
      week: g.shop.week,
      nightK,
      nightWeek,
      furniture: Object.fromEntries(Object.entries(save.furniture).map(([k, v]) => [k, v.level])),
      layout: g.shop.layout.length,
    });
    if (r.bossWin && out.bossWonAt === null) out.bossWonAt = c;
    if (out.bossWonAt !== null && out.nextLevelAt === null && districtOpen(save, nextDistrict)) out.nextLevelAt = c;
    if (o.stopAfterBoss !== false && out.bossWonAt !== null && (out.nextLevelAt !== null || c >= out.bossWonAt + 4)) break;
  }
  return out;
}
