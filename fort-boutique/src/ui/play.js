// Fort Boutique — scène de jeu : relie la partie (logique), le rendu, le HUD, l'audio et les entrées.
import { stepGame } from '../game/phases.js';
import { createRenderer } from '../render/renderer.js';
import { Particles } from '../render/particles.js';
import { Floaters } from '../render/floaters.js';
import { Camera } from '../render/camera.js';
import { PALETTE as P } from '../data/palette.js';
import {
  drawJoystick, drawSunBar, drawCoinCounter, drawPauseButton, drawPadLabel, drawCoinPile, drawDoorSign,
  hudHit, COIN_COUNTER, heart,
} from '../render/hud.js';
import { drawWantBubble } from '../render/sprites/products.js';

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
  const view = { coins: g.save.player.coins, bump: 0, comboN: 0, comboT: 0, hearts: [] };
  const audio = () => app.services.audio;
  const px = (x) => g.grid.origin.x + x * C;
  const py = (y) => g.grid.origin.y + y * C;

  function onEvent(e) {
    const a = audio();
    switch (e.type) {
      case 'pickup':
        view.comboT = 1.5;
        if (a) a.play('pickup', { n: e.a - 1 });
        break;
      case 'drop':
        if (a) a.play('drop');
        break;
      case 'door_bell':
        if (a) a.play('door_bell');
        break;
      case 'vip':
        if (a) a.play('vip');
        break;
      case 'kaching':
        if (a) a.play('kaching');
        floaters.add(`+${e.a}`, px(e.x), py(e.y) - 30, { color: P.orReflet, size: 15 });
        break;
      case 'happy':
        view.hearts.push({ x: px(e.x), y: py(e.y) - 30, t: 0 });
        if (a) a.play('happy');
        break;
      case 'grumpy':
        fx.burst('smoke', px(e.x), py(e.y) - 20, 5, '#BDC6CF', 20, 0.8, 5);
        if (a) a.play('grumpy');
        break;
      case 'coins': {
        const n = Math.min(12, Math.max(1, Math.ceil(e.a / 3)));
        const each = e.a / n;
        for (let i = 0; i < n; i++) fx.coinFlight(px(e.x), py(e.y) - 10, COIN_COUNTER.x, COIN_COUNTER.y, i * 0.04, each);
        break;
      }
      case 'pad_tick':
        if (a) a.play('pad_tick', { n: e.a });
        if (e.a % 2 === 0) fx.coinFlight(COIN_COUNTER.x, COIN_COUNTER.y, px(e.x), py(e.y), 0, 0);
        view.coins = g.save.player.coins;
        break;
      case 'build_pop':
        if (a) a.play('build_pop');
        fx.burst('dust', px(e.x), py(e.y) + 10, 8, '#E8D3B0', 70, 0.6, 5);
        camera.shake(2, 0.1);
        break;
      case 'close_shop':
        if (a) a.play('close_shop');
        break;
      default:
    }
    if (hooks.onEvent) hooks.onEvent(e);
  }

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
      stepGame(g, dt);
      for (let i = 0; i < g.events.length; i++) onEvent(g.events.items[i]);
      g.events.clear();
      fx.update(dt);
      floaters.update(dt);
      camera.update(dt);
      if (fx.arrived > 0) {
        view.coins = Math.min(g.save.player.coins, view.coins + fx.arrived);
        fx.arrived = 0;
        view.bump = 1;
        if (audio()) audio().play('coin', { n: view.comboN++ });
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
      for (const f of g.furn) if (f.jump > 0) f.jump = Math.max(0, f.jump - dt / 0.25);
      g.player.lean += ((g.player.vx || 0) * -0.6 - (g.player.lean || 0)) * Math.min(1, dt * 12);
    },
    render(ctx) {
      ctx.save();
      ctx.translate(camera.ox, camera.oy);
      renderer.draw(ctx, g, {
        night: g.phase.name === 'night',
        after: (c, ox, oy) => drawWorldOverlay(c, g, ox, oy),
      });
      fx.draw(ctx);
      floaters.draw(ctx);
      for (const h of view.hearts) heart(ctx, h.x, h.y - h.t * 40, 1.2 - h.t * 0.5);
      ctx.restore();
      drawHud(ctx, g, view);
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
      return false;
    },
    snapshot() {
      const d = g.day;
      return {
        phase: g.phase.name,
        coins: g.save.player.coins,
        level: g.save.player.level,
        xp: g.save.player.xp,
        player: { x: g.player.x, y: g.player.y, stack: g.player.stack.slice() },
        grid: { w: g.grid.w, h: g.grid.h, origin: g.grid.origin },
        furniture: g.furn.map((f) => ({ id: f.id, x: f.x, y: f.y, w: f.w, h: f.h, stock: f.stock, count: f.count, product: f.product, access: f.access })),
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
        padsDone: g.shop.pads.done.slice(),
        particles: fx.count,
      };
    },
  };
  return scene;
}

function drawWorldOverlay(ctx, g, ox, oy) {
  const d = g.day;
  if (!d) return;
  if (d.pad) drawPadLabel(ctx, d.pad, ox, oy, g.t);
  if (g.register && d.pile > 0) drawCoinPile(ctx, ox + g.register.x * C + 12, oy + g.register.y * C + 4, d.pile);
  drawDoorSign(ctx, ox + (g.grid.door.x + 0.5) * C, oy + g.grid.h * C + 22, !d.closing);
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

function drawHud(ctx, g, view) {
  const d = g.day;
  if (d) drawSunBar(ctx, 1 - Math.max(0, d.timeLeft) / d.duration);
  drawCoinCounter(ctx, view.coins, view.bump);
  drawPauseButton(ctx);
}
