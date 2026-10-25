// Fort Boutique — schéma de sauvegarde G23 (version 2 depuis la v1.1 : plans de boutique) et valeurs par défaut.
// Au chargement, la sauvegarde est fusionnée avec ces valeurs (compatibilité ascendante) :
// un champ absent ou d'un mauvais type reprend sa valeur par défaut, un champ inconnu est conservé.

import { arrangeInPlan } from '../game/plans.js';
import { DEFAULT_PLAN } from '../data/shop-plans.js';

/** Version courante du format (v2 : emplacements prévus, plan de boutique, pilote automatique). */
export const CURRENT_VERSION = 2;

/** Quartiers (identifiants de boutique). */
export const SHOP_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'];

/** Premier producteur de chaque quartier (G6.7). */
const FIRST_PRODUCER = { q1: 'cagette', q2: 'four', q3: 'pilulier', q4: 'etabli', q5: 'bonbons' };

/**
 * Boutique neuve d'un quartier (G6.7 et G23).
 * @param {string} id
 */
export function defaultShop(id) {
  const isQ1 = id === 'q1';
  const prod = FIRST_PRODUCER[id] || 'cagette';
  // v1.1 (V3) : la boutique de départ est rangée dans les emplacements du plan par défaut (l'Allée) ;
  // les comptoirs offerts des quartiers 2 à 5 sont déjà posés.
  const start = [{ id: 'caisse' }, { id: prod }, { id: 'etagere' }].concat(isQ1 ? [] : [{ id: 'comptoir' }, { id: 'comptoir' }]);
  const { layout, overflow } = arrangeInPlan(id, 0, DEFAULT_PLAN, start);
  return {
    unlocked: isQ1,
    week: 1,
    night: 1,
    day: 1,
    bossBeatenCount: 0,
    bossAssist: 0,
    franchiseStars: 0,
    redMoon: false,
    // M20 : la nuit d'avant a fini sous 50 % de Bocal : coup de main de Mamie à la suivante.
    helpNext: false,
    expansion: 0,
    layout,
    storage: overflow,
    // v1.1 : plan choisi, emplacement -> meuble (recalculé depuis la disposition), pilote automatique.
    plan: DEFAULT_PLAN,
    slots: {},
    autopilot: false,
    staff: { clerks: [], cashier: null, cashier2: null },
    recipes: {},
    pads: { done: [], active: null, paid: {} },
    lastDayTakings: 0,
    lastDayDurationS: 90,
    lastNightStars: 0,
    phase: {
      name: 'morning', dayTimeLeftS: 0, dayTakings: 0, daySales: 0, dayTips: 0, dayPile: 0, vipsSpawned: 0,
      rushDone: false, ordersSpawned: 0, orderChests: 0, order: null, rush: null, dawnClaimed: true, carried: [], firstSaleDone: false,
    },
  };
}

/**
 * Sauvegarde neuve.
 * @param {{ seed: number, now: number, lang?: string }} p
 */
export function defaultSave({ seed, now, lang = 'fr' }) {
  return {
    version: CURRENT_VERSION,
    checksum: '',
    createdAt: now,
    lastSeenAt: now,
    seed: seed >>> 0,
    settings: {
      lang,
      music: 0.8,
      sfx: 0.9,
      vibration: true,
      shake: true,
      reducedFlash: false,
      leftHanded: false,
      bigText: false,
      economy: false,
      rooster: true,
      weaknessIcons: true,
      // v1.1 : flèche d'aide (auto | always | never), vitesses du jour et de la nuit.
      guideArrow: 'auto',
      daySpeed: 1,
      nightSpeed: 1,
      // v1.1 (V4) : l'éditeur libre de l'ancien « Aménager » (option expert, désactivée).
      freeLayout: false,
    },
    player: {
      level: 1,
      xp: 0,
      coins: 0,
      rubies: 0,
      kibble: 0,
      upgrades: { shoes: 1, basket: 1, broom: 1, whistle: 1, bell: 1 },
      cat: { unlocked: false, level: 1 },
    },
    furniture: {
      etagere: { level: 1, plans: 0 },
      cagette: { level: 1, plans: 0 },
      caisse: { level: 1, plans: 0 },
    },
    shops: { q1: defaultShop('q1') },
    currentShop: 'q1',
    // v1.1 : mamieObjective = index de l'objectif en cours, par boutique ; mastery = actions de base apprises (V2.1).
    progress: { tutorialStep: 0, unlocksSeen: [], flags: {}, learned: {}, pendingUnlocks: [], pendingDistricts: [], mamieObjective: {}, mastery: {} },
    daily: {
      calendarIndex: 0,
      lastCalendarDay: -1,
      maxClaimDay: -1,
      quests: { day: -1, list: [], rerollsUsed: 0, adRerollsUsed: 0, allClaimed: false },
      weekly: { week: -1, list: [], allClaimed: false },
      streak: { count: 0, lastDay: -1, freezes: 0, best: 0, restoredWeek: -1, brokenAt: -1, brokenCount: 0 },
      challenge: { lastDay: -1, scoreToday: 0, history: [], streak: 0, lastStreakDay: -1 },
      eventProgress: { week: -1, value: 0, claimed: [] },
    },
    endless: { best: 0, chestsToday: 0, day: -1 },
    collections: { bestiary: { raton: 0 }, achievements: {}, seenMonsters: [], bestiaryTiers: {} },
    cosmetics: {
      owned: ['apron_stripes'],
      equipped: { outfit: 'apron_stripes', cat: null, theme: 'classic', coinFx: null, eyes: 'round', sign: 'wood' },
    },
    purchases: { noAds: false, cosmetics: [], receipts: [] },
    ads: { day: -1, rewardedToday: 0, byPlacement: {}, lastInterstitialAt: 0, cyclesSinceInterstitial: 0, lastRewardedAt: 0, interstitialsToday: 0 },
    stats: {
      playtimeMs: 0,
      cycles: 0,
      sessions: 0,
      nights: 0,
      sold: 0,
      served: 0,
      kills: 0,
      thievesCaught: 0,
      nights3: 0,
      vipServed: 0,
      ordersDone: 0,
      bellUses: 0,
      upgradesDone: 0,
      chestsOpened: 0,
      bossKills: {},
      bossKillsW5: {},
      // v1.1 : ventes cumulées par produit (Objectifs de Mamie).
      soldBy: {},
    },
    offline: { lastCollectAt: 0, welcomeChestForDay: -1, pendingDelivery: null },
  };
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Copie profonde d'une valeur JSON. */
export function cloneJson(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

/**
 * Fusionne `target` avec `defaults` sur place.
 * @param {any} target
 * @param {any} defaults
 * @returns {any} la cible (ou une valeur par défaut si la cible est d'un mauvais type)
 */
export function mergeDefaults(target, defaults) {
  if (defaults === null) return target === undefined ? null : target;
  if (Array.isArray(defaults)) return Array.isArray(target) ? target : cloneJson(defaults);
  if (isPlainObject(defaults)) {
    if (!isPlainObject(target)) return cloneJson(defaults);
    for (const k of Object.keys(defaults)) target[k] = mergeDefaults(target[k], defaults[k]);
    return target;
  }
  if (typeof defaults === 'number') return typeof target === 'number' && Number.isFinite(target) ? target : defaults;
  if (typeof target !== typeof defaults) return defaults;
  return target;
}

/**
 * Remet une sauvegarde lue en état sain : valeurs par défaut, types, boutiques et meubles.
 * Ne retire jamais un champ inconnu ni une monnaie, un cosmétique ou un achat.
 * @param {any} data
 * @param {{ seed: number, now: number, lang?: string }} ctx
 */
export function sanitizeSave(data, ctx) {
  const def = defaultSave(ctx);
  const save = mergeDefaults(data, def);
  for (const id of Object.keys(save.shops)) {
    if (!SHOP_IDS.includes(id)) continue;
    save.shops[id] = mergeDefaults(save.shops[id], defaultShop(id));
    const shop = save.shops[id];
    shop.layout = shop.layout.filter((it) => isPlainObject(it) && typeof it.id === 'string' && Number.isFinite(it.x) && Number.isFinite(it.y));
    shop.storage = shop.storage.filter((s) => typeof s === 'string');
  }
  save.shops.q1.unlocked = true;
  if (!SHOP_IDS.includes(save.currentShop) || !save.shops[save.currentShop]) save.currentShop = 'q1';
  for (const id of Object.keys(save.furniture)) {
    save.furniture[id] = mergeDefaults(save.furniture[id], { level: 1, plans: 0 });
    const f = save.furniture[id];
    f.level = Math.max(1, Math.min(10, Math.floor(f.level)));
    f.plans = Math.max(0, Math.floor(f.plans));
  }
  const p = save.player;
  p.level = Math.max(1, Math.min(40, Math.floor(p.level)));
  for (const k of ['coins', 'rubies', 'kibble', 'xp']) p[k] = Math.max(0, Math.floor(p[k]));
  if (!save.cosmetics.owned.includes('apron_stripes')) save.cosmetics.owned.unshift('apron_stripes');
  save.cosmetics.owned = save.cosmetics.owned.filter((c) => typeof c === 'string');
  save.version = CURRENT_VERSION;
  return save;
}
