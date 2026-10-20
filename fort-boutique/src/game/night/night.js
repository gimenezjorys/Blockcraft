// Fort Boutique — orchestration de la nuit (G8) : Bocal, vagues, télégraphe, fin de nuit, étoiles.
import { WAVES } from '../../data/waves.js';
import { monsterDef } from '../../data/monsters.js';
import { NIGHT } from '../../data/night.js';
import { XP_GAINS } from '../../data/xp.js';
import { districtNumber } from '../../data/balance.js';
import { generateNight } from './waves.js';
import { createMonsterPool, spawnMonster, stepMonsters, aliveCount } from './monsters.js';
import { createProjectilePool, stepProjectiles } from './projectiles.js';
import { initTowers, stepTowers } from './towers.js';
import { stepMerchantNight, merchantNightStats } from './merchant.js';
import { updateVisibility } from './light.js';
import { jarValue, keptRatio, starsFor } from './theft.js';
import { addXp, xpFactor } from '../progression.js';
import { computeFields } from '../state.js';

/** Bonus de dégâts du bestiaire (G14.4) : seul le palier le plus haut compte. */
export function bestiaryBonus(count) {
  if (count >= 2500) return 0.1;
  if (count >= 250) return 0.06;
  if (count >= 25) return 0.03;
  return 0;
}

/**
 * Commence la nuit.
 * @param {any} g
 * @param {{ dayTakings?: number, mods?: { weightMult?: object, speedMult?: number, lootMult?: number, hpMult?: number }, waves?: any }} [opts]
 */
export function startNight(g, opts = {}) {
  const shop = g.shop;
  const k = shop.night;
  const s = shop.week;
  const Q = districtNumber(g.shopId);
  const isBoss = k >= 7;
  const tutorial = g.shopId === 'q1' && s === 1 && k === 1 && g.save.stats.nights === 0;
  const mods = opts.mods || {};
  const gen = opts.waves || generateNight({
    seed: g.save.seed,
    districtId: g.shopId,
    week: s,
    night: k,
    entrances: g.grid.entrances,
    boss: isBoss ? g.district.boss : null,
    tutorial,
    weightMult: mods.weightMult,
    goldenChance: mods.goldenChance,
  });
  const takings = opts.dayTakings ?? shop.phase.dayTakings ?? 0;
  const jar = opts.jar ?? jarValue(Q, takings);
  const ms = merchantNightStats(g.save.player.upgrades);
  const bestiary = {};
  for (const [type, c] of Object.entries(g.save.collections.bestiary)) bestiary[type] = bestiaryBonus(c);
  const redMoon = shop.redMoon ? 1.5 + 0.5 * shop.franchiseStars : 1;
  g.night = {
    k,
    s,
    q: Q,
    t: 0,
    waves: gen.waves,
    golden: gen.golden,
    newTypes: gen.newTypes,
    tutorial,
    isBoss,
    waveIndex: 0,
    state: 'pause',
    stateT: WAVES.telegraphS,
    telegraphed: false,
    schedule: [],
    monsters: createMonsterPool(),
    projectiles: createProjectilePool(),
    lights: [],
    nextId: 0,
    spawned: 0,
    jarInitial: jar,
    jar,
    loot: 0,
    lost: 0,
    caught: 0,
    thefts: 0,
    escaped: 0,
    kills: 0,
    killsByType: {},
    theftWave: {},
    caughtWave: {},
    lostWave: {},
    bellCharge: 0,
    bellNeed: ms.bellNeed,
    bellStun: ms.bellStun,
    bellUses: 0,
    auraRadius: ms.auraRadius,
    auraBonus: ms.auraBonus,
    broomDmg: ms.broomDmg,
    repairRate: ms.repairRate,
    broomT: 0,
    repairTick: 0,
    assist: isBoss ? Math.min(NIGHT.assistMax, NIGHT.assistPerFail * shop.bossAssist) + (opts.extraAssist || 0) : 0,
    bestiaryBonus: bestiary,
    brokenCount: 0,
    firstHit: [],
    ended: false,
    result: null,
    goldenKilled: false,
    bossEscaped: false,
    bossKilled: false,
    hpMult: redMoon * (mods.hpMult || 1),
    lootMult: (mods.lootMult || 1) * (1 + 0.1 * shop.franchiseStars),
    speedMult: mods.speedMult || 1,
    groupGap: Q >= 3 ? WAVES.groupGapLateS : WAVES.groupGapS,
    scripted: null,
  };
  initTowers(g);
  computeFields(g);
  g.phase = { name: 'night', t: 0 };
  g.events.push('night_start', 0, 0, g.night.waves.length);
}

/** Construit le calendrier d'apparition d'une vague (0,35 s entre membres, 0,9 s entre groupes). */
function scheduleWave(g, wave) {
  const n = g.night;
  const out = [];
  let t = 0;
  for (const grp of wave.groups) {
    for (let i = 0; i < grp.count; i++) {
      out.push({ at: t, type: grp.type, entrance: grp.entrance, scriptedThief: !!grp.scriptedThief && i === grp.count - 1 });
      t += WAVES.memberGapS;
    }
    t += n.groupGap - WAVES.memberGapS;
  }
  if (wave.boss) out.push({ at: t + 0.4, type: wave.boss, entrance: bossEntrance(g), boss: true });
  n.schedule = out;
  n.scheduleT = 0;
}

function bossEntrance(g) {
  const e = g.grid.entrances.find((x) => x.kind === 'backdoor') || g.grid.entrances[0];
  return e.kind;
}

/** @param {any} g @param {number} dt */
export function stepNight(g, dt) {
  const n = g.night;
  if (n.ended) return;
  n.t += dt;
  // Machine à états des vagues.
  if (n.state === 'pause') {
    n.stateT -= dt;
    if (!n.telegraphed && n.stateT <= WAVES.telegraphS) {
      n.telegraphed = true;
      g.events.push('wave_warn', 0, 0, n.waveIndex, n.waves.length);
    }
    if (n.stateT <= 0) {
      n.state = 'spawning';
      scheduleWave(g, n.waves[n.waveIndex]);
      g.events.push('wave_start', 0, 0, n.waveIndex, n.waves.length);
    }
  } else if (n.state === 'spawning') {
    n.scheduleT += dt;
    while (n.schedule.length && n.schedule[0].at <= n.scheduleT) {
      const e = n.schedule.shift();
      const m = spawnMonster(g, e.type, e.entrance, { scriptedThief: e.scriptedThief, wave: n.waveIndex });
      if (m && e.scriptedThief) {
        n.scripted = m;
        m.speedBoost = 1.6;
      }
    }
    if (!n.schedule.length) n.state = 'active';
  } else if (n.state === 'active') {
    if (aliveCount(g) === 0) {
      g.events.push('wave_clear', 0, 0, n.waveIndex, n.waves.length);
      if (n.waveIndex >= n.waves.length - 1) {
        finishNight(g, false);
        return;
      }
      n.waveIndex++;
      n.state = 'pause';
      n.stateT = WAVES.pauseS;
      n.telegraphed = false;
    }
  }
  updateVisibility(g);
  stepScripted(g, dt);
  stepMonsters(g, dt);
  stepTowers(g, dt);
  stepProjectiles(g, dt);
  stepMerchantNight(g, dt);
  if (n.t >= WAVES.maxNightS) finishNight(g, true);
}

/** Voleur scénarisé de la nuit 1 : rapide jusqu'au vol, ralenti de moitié après 3 s sans réaction (G19 2:08). */
function stepScripted(g, dt) {
  const n = g.night;
  const m = n.scripted;
  if (!m || !m.alive) return;
  if (!m.thief) {
    m.speedBoostActive = true;
    return;
  }
  m.speedBoostActive = false;
  const near = Math.hypot(g.player.x - m.x, g.player.y - m.y) < 1.6;
  if (near) m.reacted = true;
  if (!m.reacted && n.t - m.stoleAt >= NIGHT.scriptedThiefGrace) m.slowedByScript = true;
  void dt;
}

/**
 * Fin de nuit : Bocal gardé, étoiles, pièces (Bocal final + butin), XP, coffre (G8.5).
 * @param {any} g
 * @param {boolean} timeout plafond de sécurité atteint
 */
export function finishNight(g, timeout) {
  const n = g.night;
  if (n.ended) return n.result;
  if (timeout) {
    // Plafond de sécurité : les Grignotins restants s'éclipsent, les sacs reviennent au Bocal (sans bonus).
    for (const m of n.monsters.active) {
      if (m.carry > 0) n.jar += m.carry;
      m.carry = 0;
      m.alive = false;
    }
    n.monsters.releaseAll();
  }
  n.projectiles.releaseAll();
  n.ended = true;
  const kept = keptRatio(n.jar, n.jarInitial);
  let stars = starsFor(kept);
  const bossNight = n.isBoss;
  const bossWin = bossNight && n.bossKilled;
  if (bossNight && !bossWin) stars = 0;
  const xq = xpFactor(g.shopId);
  const xp = XP_GAINS.nightPerStar * stars * xq + (bossWin ? XP_GAINS.boss * xq : 0);
  const coins = Math.max(0, Math.round(n.jar)) + n.loot;
  const waves = n.waves.map((_, i) => ((n.lostWave[i] || 0) > 0 ? 'lost' : (n.theftWave[i] || 0) > 0 ? 'caught' : 'clean'));
  n.result = {
    jarInitial: n.jarInitial,
    jarFinal: Math.round(n.jar),
    kept,
    stars,
    loot: n.loot,
    coins,
    xp,
    kills: n.kills,
    killsByType: n.killsByType,
    thefts: n.thefts,
    caught: n.caught,
    escaped: n.escaped,
    lost: n.lost,
    noneBroken: n.brokenCount === 0,
    waves,
    cleanWaves: waves.filter((w) => w === 'clean').length,
    golden: n.goldenKilled,
    bossNight,
    bossWin,
    timeout,
    bellUses: n.bellUses,
  };
  g.events.push('night_end', 0, 0, stars, bossWin ? 1 : 0);
  return n.result;
}

/** Applique les gains de la nuit à la sauvegarde (une seule fois, drapeau dawnClaimed, G5.2). */
export function claimNight(g, result, { doubleCoins = false } = {}) {
  const shop = g.shop;
  if (shop.phase.dawnClaimed) return false;
  shop.phase.dawnClaimed = true;
  g.save.player.coins += result.coins * (doubleCoins ? 2 : 1);
  addXp(g, result.xp);
  const st = g.save.stats;
  const col = g.save.collections;
  st.kills += result.kills || 0;
  st.thievesCaught += result.caught || 0;
  st.bellUses += result.bellUses || 0;
  for (const [type, c] of Object.entries(result.killsByType || {})) {
    const def = monsterDef(type);
    if (def && !def.child) col.bestiary[type] = (col.bestiary[type] || 0) + c;
  }
  g.save.stats.nights++;
  if (result.stars === 3) g.save.stats.nights3++;
  shop.lastNightStars = result.stars;
  return true;
}
