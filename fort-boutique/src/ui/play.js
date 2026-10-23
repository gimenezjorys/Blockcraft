// Fort Boutique — scène de jeu : relie la partie (logique), le rendu, le HUD, l'audio et les entrées.
import { stepGame } from '../game/phases.js';
import { createRenderer } from '../render/renderer.js';
import { Particles } from '../render/particles.js';
import { Floaters } from '../render/floaters.js';
import { Camera, shopZoom } from '../render/camera.js';
import { PALETTE as P, NIGHT_VEIL } from '../data/palette.js';
import { lightSources } from '../game/night/light.js';
import { bossOf } from '../game/night/boss.js';
import { WAVES } from '../data/waves.js';
import { DAY } from '../data/balance.js';
import {
  drawJoystick, drawSunBar, drawCoinCounter, drawPauseButton, drawPadLabel, drawCoinPile, drawDoorSign,
  hudHit, heart, drawWavePips, drawJarGauge, drawBellButton, drawTelegraph, drawBanner, drawBossBar, drawBossCard,
} from '../render/hud.js';
import { drawWantBubble, drawProduct, drawStatusBubble, drawUpgradeBadge } from '../render/sprites/products.js';
import { drawHintsWorld, drawGhostHand, drawOrderCard, drawEntranceWarning, drawOrderBubble, drawGuideArrow, drawOpenSign } from '../render/hints.js';
import { stepHints } from '../game/tutorial.js';
import { stepGuide } from '../game/guide.js';
import { canUpgrade } from '../game/economy.js';
import { SPECIAL_ORDER } from '../data/tutorial.js';
import { drawMonster } from '../render/sprites/monsters.js';
import { drawFurniture } from '../render/sprites/furniture.js';
import { FURNITURE, footprint } from '../data/furniture.js';
import { createFxHandler } from './play-fx.js';
import { t } from './i18n.js';

const C = 48;

/**
 * @param {any} app
 * @param {any} g partie (src/game/state.js)
 * @param {{ onPause?: () => void, onEvent?: (e: any) => void, onTap?: (x: number, y: number) => void }} [hooks]
 */
export function createPlay(app, g, hooks = {}) {
  const renderer = createRenderer({
    makeCanvas: (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    },
    pixelScale: () => app.viewport().scale * Math.min(2, window.devicePixelRatio || 1) * shopZoom(g.grid.w, g.grid.h),
  });
  const fx = new Particles();
  const floaters = new Floaters();
  const camera = new Camera();
  const baseZoomFor = () => (g.phase.name === 'morning' ? 1 : shopZoom(g.grid.w, g.grid.h));
  camera.base = camera.baseTarget = baseZoomFor();
  const view = {
    coins: g.save.player.coins, bump: 0, comboN: 0, comboT: 0, hearts: [], eyesOpened: 0, banner: null,
    cleared: 0, jarBlink: 0, shock: null, flashes: [], zoomT: 0, bossIntro: null, lights: [],
  };
  const onFx = createFxHandler({ app, g, fx, floaters, camera, view });

  /** Effets de la Garde-robe (G17) : pièces-étoiles/cœurs/feuilles, traînée de pas, confettis de victoire. */
  const COIN_STYLES = new Set(['coins_stars', 'coins_hearts', 'cal_coins_hearts', 'evt_coins_leaves', 'week_coins_leaves']);
  let trailT = 0;
  function cosmeticFx(dt) {
    const eq = g.save.cosmetics.equipped.coinFx;
    fx.coinStyle = COIN_STYLES.has(eq) ? eq : null;
    if (eq === 'fx_trail' && (Math.abs(g.input.x) + Math.abs(g.input.y) > 0.2)) {
      trailT -= dt;
      if (trailT <= 0) {
        trailT = 0.12;
        const ox = g.grid.origin.x;
        const oy = g.grid.origin.y;
        fx.burst('dust', ox + g.player.x * 48, oy + g.player.y * 48 + 10, 1, '#FFE066', 10, 0.5, 2);
      }
    }
    if (eq === 'fx_confetti') {
      for (let i = 0; i < g.events.length; i++) {
        const e = g.events.items[i];
        if (e.type === 'night_end' && e.a === 3) for (const c of ['#FF4F5E', '#FFD23F', '#46D39A', '#7FD8FF']) fx.burst('spark', 180, 200, 10, c, 160, 1.2, 3);
      }
    }
  }

  const scene = {
    /** Le joystick n'est actif que lorsque le marchand peut marcher. */
    get joystick() {
      const n = g.phase.name;
      return n === 'day' || n === 'closing' || n === 'night' || n === 'free';
    },
    game: g,
    renderer,
    fx,
    floaters,
    camera,
    view,
    update(dt) {
      g.input.x = app.input.move.x;
      g.input.y = app.input.move.y;
      if (app.input.bellPresses > 0) {
        app.input.bellPresses = 0;
        if (g.phase.name === 'night') g.input.bell = 1;
      }
      stepGame(g, dt);
      cosmeticFx(dt);
      // Indices des 10 premières minutes (G19) et flèche d'objectif (V2) : ils lisent les événements de ce pas.
      stepHints(g, dt);
      stepGuide(g, dt);
      for (let i = 0; i < g.events.length; i++) {
        const e = g.events.items[i];
        onFx(e);
        if (hooks.onEvent) hooks.onEvent(e);
      }
      g.events.clear();
      fx.update(dt);
      floaters.update(dt);
      camera.baseTarget = baseZoomFor();
      camera.update(dt);
      tickView(dt);
    },
    render(ctx) {
      fx.density = app.economy ? 0.5 : 1;
      const name = g.phase.name;
      const night = name === 'night' || name === 'dawn' || (name === 'dusk' && g.phase.t > 2.6);
      const { veil, tint } = veilFor(g);
      const lights = veil > 0 && g.night ? lightSources(g, view.lights) : veil > 0 ? duskLights(g, view.lights) : view.lights;
      ctx.save();
      ctx.translate(180, 330);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-180 + camera.ox, -330 + camera.oy);
      ctx.translate(180, 0);
      ctx.scale(camera.base, camera.base);
      ctx.translate(-180, 0);
      renderer.draw(ctx, g, {
        economy: !!app.economy,
        night,
        veil,
        tint,
        lights,
        flashes: view.flashes,
        after: (c, ox, oy) => drawWorldOverlay(c, g, ox, oy),
        afterLight: (c, ox, oy) => drawAfterLight(c, g, view, ox, oy),
      });
      fx.draw(ctx);
      floaters.draw(ctx);
      for (const h of view.hearts) heart(ctx, h.x, h.y - h.t * 40, 1.2 - h.t * 0.5);
      if (view.shock) {
        const k = view.shock.t / 0.5;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = P.craie;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(view.shock.x, view.shock.y, 20 + k * 220, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      drawHud(ctx, g, view, app);
      drawJoystick(ctx, app.input.joystick);
    },
    hitTest(x, y) {
      return hudHit(x, y, { bell: g.phase.name === 'night' && !!g.night && !g.night.tutorial });
    },
    onButton(id, phase) {
      if (id === 'pause' && phase === 'up' && hooks.onPause) hooks.onPause();
    },
    onTap(x, y) {
      if (hooks.onTap) hooks.onTap(x, y);
    },
    onKey(key) {
      if (key === 'Escape' && hooks.onPause) {
        hooks.onPause();
        return true;
      }
      if (key === ' ' && g.phase.name === 'night') {
        g.input.bell = 1;
        return true;
      }
      return false;
    },
    snapshot: () => snapshot(g, fx, renderer),
    /** Position à l'écran (pixels logiques) d'un point du monde exprimé en cases (scène de l'enveloppe, G19 0:02). */
    worldToScreen(cx, cy) {
      const wx = g.grid.origin.x + cx * C;
      const wy = g.grid.origin.y + cy * C;
      const z = camera.base || 1;
      return { x: 180 + (wx - 180) * z, y: wy * z };
    },
  };

  function tickView(dt) {
    if (fx.arrived > 0) {
      view.coins = Math.min(g.save.player.coins, view.coins + fx.arrived);
      fx.arrived = 0;
      view.bump = 1;
      const a = app.services.audio;
      if (a) a.play('coin', { n: view.comboN++ });
    }
    if (view.coins > g.save.player.coins) view.coins = g.save.player.coins;
    if (!fx.count && view.coins < g.save.player.coins) view.coins = g.save.player.coins;
    view.bump = Math.max(0, view.bump - dt / 0.12);
    view.comboT -= dt;
    if (view.comboT <= 0) view.comboN = 0;
    for (let i = view.hearts.length - 1; i >= 0; i--) {
      view.hearts[i].t += dt;
      if (view.hearts[i].t > 0.6) view.hearts.splice(i, 1);
    }
    for (let i = view.flashes.length - 1; i >= 0; i--) {
      view.flashes[i].t += dt;
      if (view.flashes[i].t > 0.06) view.flashes.splice(i, 1);
    }
    if (view.banner) {
      view.banner.t += dt;
      if (view.banner.t > view.banner.life) view.banner = null;
    }
    if (view.shock) {
      view.shock.t += dt;
      if (view.shock.t > 0.5) view.shock = null;
    }
    if (view.zoomT > 0) {
      view.zoomT -= dt;
      if (view.zoomT <= 0) camera.targetZoom = 1;
    }
    if (view.bossIntro) {
      view.bossIntro.t += dt;
      if (view.bossIntro.t > 2.2) view.bossIntro = null;
    }
    view.jarBlink = Math.max(0, view.jarBlink - dt / 0.8);
    for (const f of g.furn) {
      if (f.jump > 0) f.jump = Math.max(0, f.jump - dt / 0.25);
      if (f.slide && f.slide.t > 0) f.slide.t = Math.max(0, f.slide.t - dt / 0.45);
    }
    g.player.lean = (g.player.lean || 0) + ((g.player.vx || 0) * -0.6 - (g.player.lean || 0)) * Math.min(1, dt * 12);
  }

  return scene;
}

/** Teinte du voile de nuit en Lune rouge (M21). */
const RED_MOON_VEIL = '#4A0F2A';

/** Voile et teinte selon la phase (crépuscule : orange -> violet -> nuit en 4 s, G20.5). */
function veilFor(g) {
  const name = g.phase.name;
  const full = g.district.dark ? NIGHT_VEIL.dark : NIGHT_VEIL.normal;
  // Lune rouge (Franchise, G13.4) : la nuit tire sur le pourpre, pour qu'on la reconnaisse d'un coup d'œil.
  const night = g.shop && g.shop.redMoon ? RED_MOON_VEIL : P.voileNuit;
  if (name === 'dusk') {
    const k = Math.min(1, g.phase.t / 4);
    if (k < 0.35) return { veil: 0.3 * (k / 0.35), tint: '#FFB36B' };
    if (k < 0.7) return { veil: 0.3 + (full - 0.3) * ((k - 0.35) / 0.35), tint: '#6A3FA8' };
    return { veil: full, tint: night };
  }
  if (name === 'night') return { veil: full, tint: night };
  if (name === 'dawn') return { veil: Math.max(0, full * (1 - g.phase.t / 2)), tint: '#6A3FA8' };
  return { veil: 0, tint: P.voileNuit };
}

/** Pendant le crépuscule, les lampes s'allument une à une (lanterne du marchand + meubles lumineux). */
function duskLights(g, out) {
  out.length = 0;
  out.push({ x: g.player.x, y: g.player.y, r: 1.8, kind: 'merchant' });
  return out;
}

/** Améliorable maintenant ? (recalculé au plus une fois par seconde, V2.2) */
const upCache = { t: -1, set: new Set(), save: null };
function upgradableNow(g, id) {
  if (upCache.save !== g.save || g.t - upCache.t > 1 || g.t < upCache.t) {
    upCache.t = g.t;
    upCache.save = g.save;
    upCache.set.clear();
    for (const f of g.furn) if (!upCache.set.has(f.id) && canUpgrade(g.save, f.id).ok) upCache.set.add(f.id);
  }
  return upCache.set.has(id);
}

/** Bulles d'état du jour (V2.2) : étagère vide ou à moitié, producteur plein, file à la caisse. */
function drawStatusBubbles(ctx, g, ox, oy) {
  const d = g.day;
  for (const f of g.furn) {
    const kind = f.def.day.kind;
    const x = ox + (f.x + f.w / 2) * C;
    const y = oy + f.y * C - 10;
    if (kind === 'shelf' && f.product) {
      const k = f.count / Math.max(1, f.capacity);
      if (f.count === 0) {
        ctx.save();
        ctx.translate(x, y);
        drawStatusBubble(ctx, 'empty', f.product, 0, g.t);
        ctx.restore();
      } else if (k < 0.5) {
        ctx.save();
        ctx.translate(x + 10, y + 4);
        drawStatusBubble(ctx, 'low', f.product, 0, g.t);
        ctx.restore();
      }
    } else if (kind === 'producer' && f.reserve > 0 && f.stock >= f.reserve) {
      ctx.save();
      ctx.translate(x, y);
      drawStatusBubble(ctx, 'full', f.def.day.product, f.stock, g.t);
      ctx.restore();
    }
  }
  if (g.register && d.queue.length >= 2) {
    ctx.save();
    ctx.translate(ox + (g.register.x + 0.5) * C, oy + g.register.y * C - 12);
    drawStatusBubble(ctx, 'queue', null, d.queue.length, g.t);
    ctx.restore();
  }
}

function drawWorldOverlay(ctx, g, ox, oy) {
  const d = g.day;
  const name = g.phase.name;
  if (d && (name === 'day' || name === 'closing')) {
    if (d.pad) {
      // Silhouette du meuble à venir, en filigrane (Hugo, P1 : on voit ce qu'on achète, sans texte).
      const def = FURNITURE[d.pad.furniture];
      if (def) {
        const [w, h] = footprint(def, 0);
        ctx.globalAlpha = 0.32;
        drawFurniture(ctx, d.pad.furniture, ox + d.pad.x * C, oy + d.pad.y * C, w * C, h * C, {});
        ctx.globalAlpha = 1;
      }
      drawPadLabel(ctx, d.pad, ox, oy, g.t);
    }
    if (g.register && d.pile > 0) drawCoinPile(ctx, ox + g.register.x * C + 12, oy + g.register.y * C + 4, d.pile);
    if (d.order && d.order.waiting) {
      const o = d.order;
      drawOrderBubble(ctx, ox + o.c.x * C, oy + o.c.y * C, (c) => drawProduct(c, o.product, 0.75), o.got, o.need, g.t);
    }
    for (const c of d.customers) {
      if (c.state === 'wait') {
        const k = c.patienceFull ? Math.max(0, c.patience / c.patienceFull) : 1;
        ctx.save();
        ctx.translate(ox + c.x * C, oy + c.y * C - 34);
        // V2.2 : la bulle passe du blanc à l'orange puis au rouge quand le client s'impatiente.
        drawWantBubble(ctx, c.wants[c.got.length], 1, k > 0.6 ? P.ticket : k > 0.3 ? '#FFC58A' : '#FF8A8A');
        ctx.restore();
      }
    }
    drawStatusBubbles(ctx, g, ox, oy);
  }
  // Meubles améliorables (plans et pièces suffisants) : flèche verte dans un coin, le jour comme la nuit (V2.2).
  if (name === 'day' || name === 'closing' || name === 'night' || name === 'morning') {
    for (const f of g.furn) if (upgradableNow(g, f.id)) drawUpgradeBadge(ctx, ox + (f.x + f.w) * C - 6, oy + f.y * C + 4, g.t);
  }
  drawDoorSign(ctx, ox + (g.grid.door.x + 0.5) * C, oy + g.grid.h * C + 22, name === 'day' || name === 'morning' || name === 'free');
}

/** Bulles du télégraphe (2,5 s avant chaque vague) et indices sans texte (G19), au-dessus du voile de nuit. */
function drawAfterLight(ctx, g, view, ox, oy) {
  const ph = g.phase.name;
  if (g.hints && (ph === 'day' || ph === 'closing' || ph === 'night')) drawHintsWorld(ctx, g.hints, g.player, ox, oy, g.t);
  // Flèche d'objectif (V2.1) : une seule cible, au-dessus du voile de nuit.
  // Ouverture (V2.4) : le panneau de la porte se retourne, « Fermé » puis « Ouvert ».
  if (ph === 'day' && g.day && g.phase.t < DAY.openS + 0.6) {
    const door = g.grid.door;
    const k = Math.min(1, g.phase.t / DAY.openS);
    const fade = Math.max(0, Math.min(1, (DAY.openS + 0.6 - g.phase.t) / 0.6));
    drawOpenSign(ctx, ox + (door.x + 0.5) * C, oy + (door.y + 0.95) * C, k, fade, t('hud.closedSign'), t('hud.openSign'));
  }
  const gd = g.guide;
  if (gd && gd.visible && gd.target) drawGuideArrow(ctx, ox + gd.target.x * C, oy + gd.target.y * C, g.t, gd.target.kind === 'thief');
  // G19 10:10 : la nuit qui vient ouvre une nouvelle entrée ; on la montre dès la fermeture.
  if ((ph === 'closing' || ph === 'dusk') && g.shop.week === 1) {
    for (const e of g.grid.entrances) {
      if (e.fromNight > 1 && e.fromNight === g.shop.night) drawEntranceWarning(ctx, ox + (e.x + 0.5) * C, oy + (e.y + 0.5) * C, g.t, t('hud.new'));
    }
  }
  const n = g.night;
  if (!n || g.phase.name !== 'night' || n.ended) return;
  if (n.state === 'pause' && n.stateT <= WAVES.telegraphS) {
    const wave = n.waves[n.waveIndex];
    if (!wave) return;
    const byEntrance = new Map();
    for (const grp of wave.groups) {
      if (!byEntrance.has(grp.entrance)) byEntrance.set(grp.entrance, []);
      const list = byEntrance.get(grp.entrance);
      if (!list.includes(grp.type)) list.push(grp.type);
    }
    if (wave.boss) {
      const e = g.grid.entrances.find((x) => x.kind === 'backdoor');
      if (e) {
        if (!byEntrance.has(e.kind)) byEntrance.set(e.kind, []);
        byEntrance.get(e.kind).push(wave.boss);
      }
    }
    for (const [kind, types] of byEntrance) {
      const e = g.grid.entrances.find((x) => x.kind === kind);
      if (!e) continue;
      const seen = g.save.collections.seenMonsters;
      const isNew = types.some((ty) => !seen.includes(ty));
      let x = ox + (e.x + 0.5) * C;
      let y = oy + (e.y + 0.5) * C - 30;
      if (kind === 'windowLeft') x += 20;
      if (kind === 'windowRight') x -= 20;
      if (kind === 'backdoor' || kind === 'chimney') y = oy + 26;
      drawTelegraph(ctx, x, y, types.slice(0, 3), (c, ty) => drawMonster(c, ty, 0, {}), isNew, g.t, t('hud.new'));
    }
  }
}

function drawHud(ctx, g, view, app) {
  const name = g.phase.name;
  // Au Matin et à l'Aube, l'interface DOM porte les compteurs.
  if (name === 'morning' || name === 'dawn') return;
  const d = g.day;
  if (d && (name === 'day' || name === 'closing')) {
    drawSunBar(ctx, 1 - Math.max(0, d.timeLeft) / d.duration);
    drawCoinCounter(ctx, view.coins, view.bump);
    if (d.order && d.order.waiting) {
      const product = d.order.product;
      drawOrderCard(ctx, d.order, (c) => drawProduct(c, product, 1.1), SPECIAL_ORDER.deliverS, g.t);
    }
  } else if (g.night && (name === 'night' || name === 'dawn')) {
    const n = g.night;
    drawWavePips(ctx, n.waveIndex, n.waves.length, view.cleared, !!n.endless);
    drawJarGauge(ctx, n.jar / Math.max(1, n.jarInitial), Math.round(n.jar), view.jarBlink);
    const boss = bossOf(g);
    if (boss) drawBossBar(ctx, boss.hp / Math.max(1, boss.maxHp), boss.hitT || 0);
    if (view.bossIntro && name === 'night') {
      const type = view.bossIntro.type;
      const courage = n.assist > 0 ? t('night.courage', { n: Math.round(n.assist * 100) }) : null;
      drawBossCard(ctx, (c) => drawMonster(c, type, 0, {}), t(`mon.${type}`), view.bossIntro.t, courage);
    }
    // Nuit du tutoriel : la Cloche ne peut pas se charger (7 Grignotins pour 14), on ne la montre pas (Hugo, P1).
    if (name === 'night' && !n.tutorial) drawBellButton(ctx, n.bellCharge, n.bellNeed, g.t, !!(app.services.settings && app.services.settings.leftHanded));
  } else {
    drawCoinCounter(ctx, view.coins, view.bump);
  }
  drawPauseButton(ctx);
  if (view.banner) drawBanner(ctx, view.banner.text, view.banner.t, view.banner.life, view.banner.color);
  // Main fantôme : jamais par-dessus un doigt posé (elle montre le geste, elle ne le gêne pas).
  if (g.hints && g.hints.hand && !app.input.joystick.active && (name === 'day' || name === 'closing' || name === 'night')) drawGhostHand(ctx, g.hints.hand, g.t);
}

function snapshot(g, fx, renderer) {
  const d = g.day;
  const n = g.night;
  return {
    phase: g.phase.name,
    coins: g.save.player.coins,
    level: g.save.player.level,
    xp: g.save.player.xp,
    player: { x: g.player.x, y: g.player.y, stack: g.player.stack.slice() },
    grid: { w: g.grid.w, h: g.grid.h, origin: g.grid.origin },
    furniture: g.furn.map((f) => ({
      id: f.id, kind: f.def.day.kind, x: f.x, y: f.y, w: f.w, h: f.h, stock: f.stock, count: f.count, capacity: f.capacity || 0,
      product: f.def.day.kind === 'producer' ? f.def.day.product : f.product, access: f.access, hp: f.hp, maxHp: f.maxHp, broken: f.broken, eyes: f.eyes, level: f.level,
    })),
    save: {
      level: g.save.player.level, xp: g.save.player.xp, coins: g.save.player.coins, rubies: g.save.player.rubies,
      cycles: g.save.stats.cycles, nights: g.save.stats.nights, day: g.shop.day, night: g.shop.night, week: g.shop.week,
      phaseName: g.shop.phase.name, dawnClaimed: g.shop.phase.dawnClaimed, chestsOpened: g.save.stats.chestsOpened || 0,
      upgrades: g.save.stats.upgradesDone || 0,
      furniture: Object.fromEntries(Object.entries(g.save.furniture).map(([k, v]) => [k, { level: v.level, plans: v.plans }])),
    },
    day: d
      ? {
          timeLeft: d.timeLeft,
          takings: d.takings,
          served: d.served,
          customers: d.customers.length,
          queue: d.queue.length,
          pile: d.pile,
          pad: d.pad ? { id: d.pad.id, x: d.pad.x, y: d.pad.y, price: d.pad.price, paid: d.pad.paid } : null,
        }
      : null,
    night: n
      ? {
          wave: n.waveIndex,
          waves: n.waves.length,
          state: n.state,
          jar: n.jar,
          jarInitial: n.jarInitial,
          monsters: n.monsters.active.map((m) => ({ type: m.type, x: m.x, y: m.y, hp: m.hp, thief: m.thief, carry: m.carry, entering: m.entering })),
          kills: n.kills,
          bellCharge: n.bellCharge,
          bellNeed: n.bellNeed,
          ended: n.ended,
          result: n.result,
        }
      : null,
    padsDone: g.shop.pads.done.slice(),
    hints: g.hints
      ? { hand: !!g.hints.hand, arrow: g.hints.arrow ? g.hints.arrow.color : null, to: g.hints.arrow ? { x: g.hints.arrow.tx, y: g.hints.arrow.ty } : null, halo: !!g.hints.halo, shown: g.hints.shown }
      : null,
    // v1.1 : flèche d'objectif (V2.1) et Objectifs de Mamie (V2.3).
    guide: g.guide ? { visible: g.guide.visible, reason: g.guide.reason, target: g.guide.target ? { x: g.guide.target.x, y: g.guide.target.y, kind: g.guide.target.kind } : null } : null,
    mamie: Object.assign({}, g.save.progress.mamieObjective || {}),
    order: d && d.order ? { product: d.order.product, need: d.order.need, got: d.order.got, timeLeft: d.order.timeLeft, waiting: d.order.waiting, x: d.order.c.x, y: d.order.c.y } : null,
    rush: !!(d && d.rush),
    newEntrance: (g.phase.name === 'closing' || g.phase.name === 'dusk') && g.shop.week === 1
      ? g.grid.entrances.filter((e) => e.fromNight > 1 && e.fromNight === g.shop.night).map((e) => e.kind)
      : [],
    particles: fx.count,
    drawnMonsters: renderer.stats.monsters,
  };
}
