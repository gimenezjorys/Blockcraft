// Fort Boutique — schéma de sauvegarde G23 (version 1) et valeurs par défaut.
// Au chargement, la sauvegarde est fusionnée avec ces valeurs (compatibilité ascendante) :
// un champ absent ou d'un mauvais type reprend sa valeur par défaut, un champ inconnu est conservé.

/** Version courante du format. */
export const CURRENT_VERSION = 1;

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
  return {
    unlocked: isQ1,
    week: 1,
    night: 1,
    day: 1,
    bossBeatenCount: 0,
    bossAssist: 0,
    franchiseStars: 0,
    redMoon: false,
    expansion: 0,
    layout: [
      { id: 'caisse', x: 3, y: 4, rot: 0 },
      { id: prod, x: 0, y: 1, rot: 0 },
      { id: 'etagere', x: 0, y: 4, rot: 0 },
    ],
    storage: isQ1 ? [] : ['comptoir', 'comptoir'],
    staff: { clerks: [], cashier: null },
    recipes: {},
    pads: { done: [], active: null, paid: {} },
    lastDayTakings: 0,
    lastDayDurationS: 90,
    lastNightStars: 0,
    phase: {
      name: 'morning', dayTimeLeftS: 0, dayTakings: 0, daySales: 0, dayTips: 0, dayPile: 0, vipsSpawned: 0,
      rushDone: false, ordersSpawned: 0, orderChests: 0, dawnClaimed: true, carried: [], firstSaleDone: false,
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
    progress: { tutorialStep: 0, unlocksSeen: [], flags: {}, learned: {}, pendingUnlocks: [], pendingDistricts: [] },
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
