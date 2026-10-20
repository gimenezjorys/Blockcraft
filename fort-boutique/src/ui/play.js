// Fort Boutique — scène de jeu : relie la partie (logique), le rendu, le HUD, l'audio et les entrées.
import { stepGame } from '../game/phases.js';
import { createRenderer } from '../render/renderer.js';
import { Particles } from '../render/particles.js';
import { Floaters } from '../render/floaters.js';
import { Camera } from '../render/camera.js';
import { PALETTE as P, NIGHT_VEIL } from '../data/palette.js';
import { lightSources } from '../game/night/light.js';
import { WAVES } from '../data/waves.js';
import {
  drawJoystick, drawSunBar, drawCoinCounter, drawPauseButton, drawPadLabel, drawCoinPile, drawDoorSign,
  hudHit, heart, drawWavePips, drawJarGauge, drawBellButton, drawTelegraph, drawBanner,
} from '../render/hud.js';
import { drawWantBubble } from '../render/sprites/products.js';
import { drawMonster } from '../render/sprites/monsters.js';
import { createFxHandler } from './play-fx.js';
import { t } from './i18n.js';

const C = 48;

/**
 * @param {any} app
 * @param {any} g partie (src/game/state.js)
 * @param {{ onPause?: () => void, onEvent?: (e: any) => void }} [hooks]
 */
export function createPlay(app, g, hooks = {}) {
  const renderer = createRenderer({
    makeCanvas: (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    },
    pixelScale: () => app.viewport().scale * Math.min(2, window.devicePixelRatio || 1),
  });
  const fx = new Particles();
  const floaters = new Floaters();
  const camera = new Camera();
  const view = {
    coins: g.save.player.coins, bump: 0, comboN: 0, comboT: 0, hearts: [], eyesOpened: 0, banner: null,
    cleared: 0, jarBlink: 0, shock: null, flashes: [], zoomT: 0, bossIntro: null, lights: [],
  };
  const onFx = createFxHandler({ app, g, fx, floaters, camera, view });

  const scene = {
    joystick: true,
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
      for (let i = 0; i < g.events.length; i++) {
        const e = g.events.items[i];
        onFx(e);
        if (hooks.onEvent) hooks.onEvent(e);
      }
      g.events.clear();
      fx.update(dt);
      floaters.update(dt);
      camera.update(dt);
      tickView(dt);
    },
    render(ctx) {
      const name = g.phase.name;
      const night = name === 'night' || name === 'dawn' || (name === 'dusk' && g.phase.t > 2.6);
      const { veil, tint } = veilFor(g);
      const lights = veil > 0 && g.night ? lightSources(g, view.lights) : veil > 0 ? duskLights(g, view.lights) : view.lights;
      ctx.save();
      ctx.translate(180, 330);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-180 + camera.ox, -330 + camera.oy);
      renderer.draw(ctx, g, {
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
      return hudHit(x, y, { bell: g.phase.name === 'night' });
    },
    onButton(id, phase) {
      if (id === 'pause' && phase === 'up' && hooks.onPause) hooks.onPause();
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
    for (const f of g.furn) if (f.jump > 0) f.jump = Math.max(0, f.jump - dt / 0.25);
    g.player.lean = (g.player.lean || 0) + ((g.player.vx || 0) * -0.6 - (g.player.lean || 0)) * Math.min(1, dt * 12);
  }

  return scene;
}

/** Voile et teinte selon la phase (crépuscule : orange -> violet -> nuit en 4 s, G20.5). */
function veilFor(g) {
  const name = g.phase.name;
  const full = g.district.dark ? NIGHT_VEIL.dark : NIGHT_VEIL.normal;
  if (name === 'dusk') {
    const k = Math.min(1, g.phase.t / 4);
    if (k < 0.35) return { veil: 0.3 * (k / 0.35), tint: '#FFB36B' };
    if (k < 0.7) return { veil: 0.3 + (full - 0.3) * ((k - 0.35) / 0.35), tint: '#6A3FA8' };
    return { veil: full, tint: P.voileNuit };
  }
  if (name === 'night') return { veil: full, tint: P.voileNuit };
  if (name === 'dawn') return { veil: Math.max(0, full * (1 - g.phase.t / 2)), tint: '#6A3FA8' };
  return { veil: 0, tint: P.voileNuit };
}

/** Pendant le crépuscule, les lampes s'allument une à une (lanterne du marchand + meubles lumineux). */
function duskLights(g, out) {
  out.length = 0;
  out.push({ x: g.player.x, y: g.player.y, r: 1.8, kind: 'merchant' });
  return out;
}

function drawWorldOverlay(ctx, g, ox, oy) {
  const d = g.day;
  const name = g.phase.name;
  if (d && (name === 'day' || name === 'closing')) {
    if (d.pad) drawPadLabel(ctx, d.pad, ox, oy, g.t);
    if (g.register && d.pile > 0) drawCoinPile(ctx, ox + g.register.x * C + 12, oy + g.register.y * C + 4, d.pile);
    for (const c of d.customers) {
      if (c.state === 'wait') {
        const k = c.patienceFull ? Math.max(0, c.patience / c.patienceFull) : 1;
        ctx.save();
        ctx.translate(ox + c.x * C, oy + c.y * C - 34);
        drawWantBubble(ctx, c.wants[c.got.length], 0.6 + 0.4 * k);
        ctx.restore();
      }
    }
  }
  drawDoorSign(ctx, ox + (g.grid.door.x + 0.5) * C, oy + g.grid.h * C + 22, name === 'day' || name === 'morning' || name === 'free');
}

/** Bulles du télégraphe (2,5 s avant chaque vague). */
function drawAfterLight(ctx, g, view, ox, oy) {
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
  const d = g.day;
  if (d && (name === 'day' || name === 'closing')) {
    drawSunBar(ctx, 1 - Math.max(0, d.timeLeft) / d.duration);
    drawCoinCounter(ctx, view.coins, view.bump);
  } else if (g.night && (name === 'night' || name === 'dawn')) {
    const n = g.night;
    drawWavePips(ctx, n.waveIndex, n.waves.length, view.cleared);
    drawJarGauge(ctx, n.jar / Math.max(1, n.jarInitial), Math.round(n.jar), view.jarBlink);
    if (name === 'night') drawBellButton(ctx, n.bellCharge, n.bellNeed, g.t, !!(app.services.settings && app.services.settings.leftHanded));
  } else {
    drawCoinCounter(ctx, view.coins, view.bump);
  }
  drawPauseButton(ctx);
  if (view.banner) drawBanner(ctx, view.banner.text, view.banner.t, view.banner.life, view.banner.color);
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
    furniture: g.furn.map((f) => ({ id: f.id, x: f.x, y: f.y, w: f.w, h: f.h, stock: f.stock, count: f.count, product: f.product, hp: f.hp, broken: f.broken, eyes: f.eyes })),
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
          monsters: n.monsters.active.map((m) => ({ type: m.type, x: m.x, y: m.y, hp: m.hp, thief: m.thief, carry: m.carry })),
          kills: n.kills,
          bellCharge: n.bellCharge,
          bellNeed: n.bellNeed,
          ended: n.ended,
          result: n.result,
        }
      : null,
    padsDone: g.shop.pads.done.slice(),
    particles: fx.count,
    drawnMonsters: renderer.stats.monsters,
  };
}
