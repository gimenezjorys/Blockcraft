// Fort Boutique — rendu principal : coque en cache, meubles et Grignotins pré-rendus, tri par profondeur,
// éclairage nocturne, éléments lumineux par-dessus le voile (G20.5).
import { PALETTE as P } from '../data/palette.js';
import { SpriteCache, disc } from './sprites/draw.js';
import { drawShopShell, drawBackdrop, drawPad } from './sprites/shop.js';
import { drawFurniture } from './sprites/furniture.js';
import { drawMerchant, drawCustomer } from './sprites/characters.js';
import { drawMonster, drawMonsterEyes, MONSTER_LOOK } from './sprites/monsters.js';
import { drawProjectile } from './sprites/projectiles.js';
import { Lighting } from './lighting.js';

const C = 48;

/**
 * @param {{ makeCanvas: (w: number, h: number) => HTMLCanvasElement, pixelScale: () => number }} env
 */
export function createRenderer(env) {
  let shell = null;
  let shellKey = '';
  let spriteScale = 2;
  const sprites = new SpriteCache(env.makeCanvas, spriteScale);
  const lighting = new Lighting(env.makeCanvas);
  const drawList = [];
  const pool = [];
  let poolN = 0;
  const stats = { monsters: 0 };
  function item(kind, y, ref) {
    let o = pool[poolN];
    if (!o) {
      o = { kind: '', y: 0, ref: null };
      pool.push(o);
    }
    poolN++;
    o.kind = kind;
    o.y = y;
    o.ref = ref;
    drawList.push(o);
  }
  const byY = (a, b) => a.y - b.y;

  function ensureShell(g, night) {
    const ps = Math.min(3, env.pixelScale());
    const key = `${g.layoutVersion}|${g.grid.w}x${g.grid.h}|${night ? 1 : 0}|${g.save.cosmetics.equipped.theme}|${ps}`;
    if (key === shellKey && shell) return ps;
    if (Math.abs(ps - spriteScale) > 0.01) {
      spriteScale = ps;
      sprites.scale = ps;
      sprites.clear();
    }
    shellKey = key;
    shell = env.makeCanvas(Math.ceil(360 * ps), Math.ceil(640 * ps));
    const c = shell.getContext('2d');
    c.setTransform(ps, 0, 0, ps, 0, 0);
    drawShopShell(c, g.grid, { night, theme: g.save.cosmetics.equipped.theme });
    return ps;
  }

  function furnitureSprite(f, night) {
    const w = f.w * C;
    const h = f.h * C;
    const eyesQ = f.eyes > 0 ? Math.round(f.eyes * 4) : 0;
    const look = f.eyes > 0.4 ? Math.round(((Math.atan2(f.lookY, f.lookX) + Math.PI) / (Math.PI * 2)) * 8) % 8 : 0;
    const key = `${f.id}|${f.w}${f.h}|${night ? 1 : 0}|${f.product || ''}|${f.count}|${Math.min(f.stock, 9)}|${eyesQ}|${look}|${f.broken ? 1 : 0}|${f.capacity || 0}|${f.jarQ ?? ''}`;
    return sprites.get(key, w + 8, h + 30, 4, 26, (ctx) => {
      const a = (look / 8) * Math.PI * 2 - Math.PI;
      drawFurniture(ctx, f.id, 0, 0, w, h, {
        night: night ? 1 : 0,
        product: f.product,
        count: f.count,
        cap: f.capacity || 4,
        stock: f.stock,
        eyes: f.eyes > 0 ? eyesQ / 4 : undefined,
        lookX: Math.cos(a),
        lookY: Math.sin(a),
        broken: f.broken,
        jar: f.jarQ === undefined ? 1 : f.jarQ / 6,
      });
    });
  }

  function monsterSprite(m, frame) {
    const L = MONSTER_LOOK[m.type] || MONSTER_LOOK.raton;
    const size = L.r * 6;
    const key = `m|${m.type}|${frame}|${m.dir < 0 ? 0 : 1}|${m.thief ? 1 : 0}`;
    return sprites.get(key, size, size + (L.fly || 0), size / 2, size * 0.8 + (L.fly || 0) * 0.5, (ctx) => {
      drawMonster(ctx, m.type, frame, { thief: m.thief, dir: m.dir });
    });
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {any} g partie
   * @param {{ night?: boolean, veil?: number, tint?: string, lights?: any[], flashes?: any[], after?: Function, afterLight?: Function }} [o]
   */
  function draw(ctx, g, o = {}) {
    const night = !!o.night;
    const ps = ensureShell(g, night);
    drawBackdrop(ctx);
    ctx.drawImage(shell, 0, 0, 360, 640);
    const ox = g.grid.origin.x;
    const oy = g.grid.origin.y;
    if (g.day && g.day.pad && (g.phase.name === 'day' || g.phase.name === 'closing')) {
      const pad = g.day.pad;
      drawPad(ctx, ox + pad.x * C, oy + pad.y * C, C, pad.paid / pad.price, g.t);
    }
    const n = g.night && !g.night.ended && g.phase.name === 'night' ? g.night : null;
    if (n) drawAura(ctx, g, ox, oy);
    drawList.length = 0;
    poolN = 0;
    for (const f of g.furn) item('f', f.y + f.h - 0.05, f);
    item('p', g.player.y, g.player);
    if (g.day && (g.phase.name === 'day' || g.phase.name === 'closing')) for (const c of g.day.customers) item('c', c.y, c);
    stats.monsters = 0;
    if (n) {
      const arr = n.monsters.active;
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (m.ghost && !m.visible) continue;
        item('m', m.y, m);
        stats.monsters++;
      }
    }
    drawList.sort(byY);
    for (const d of drawList) {
      if (d.kind === 'f') {
        const f = d.ref;
        const s = furnitureSprite(f, night);
        const jy = f.jump > 0 ? -Math.sin(Math.min(1, f.jump) * Math.PI) * 6 : 0;
        const rx = f.recoil > 0 ? -(f.lookX || 0) * f.recoil * 2 : 0;
        const ry = f.recoil > 0 ? -(f.lookY || 0) * f.recoil * 2 : 0;
        sprites.blit(ctx, s, ox + f.x * C + rx, oy + f.y * C + jy + ry);
        if (f.flash > 0) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = P.danger;
          ctx.fillRect(ox + f.x * C + 4, oy + f.y * C - 4, f.w * C - 8, f.h * C - 6);
          ctx.globalAlpha = 1;
        }
      } else if (d.kind === 'p') {
        const p = d.ref;
        ctx.save();
        ctx.translate(ox + p.x * C, oy + p.y * C + 12);
        drawMerchant(ctx, p, night, g.save.cosmetics.equipped.outfit);
        ctx.restore();
      } else if (d.kind === 'c') {
        const c = d.ref;
        ctx.save();
        ctx.translate(ox + c.x * C, oy + c.y * C + 12);
        drawCustomer(ctx, c);
        ctx.restore();
      } else {
        drawMonsterBody(ctx, d.ref, ox, oy, g.t);
      }
    }
    if (n) {
      const arr = n.projectiles.active;
      for (let i = 0; i < arr.length; i++) drawProjectile(ctx, arr[i], ox, oy);
    }
    if (o.after) o.after(ctx, ox, oy);
    if (o.veil > 0) lighting.draw(ctx, g, { alpha: o.veil, ps, lights: o.lights || [], tint: o.tint, flashes: o.flashes });
    // Éléments lumineux par-dessus le voile.
    if (n) {
      const arr = n.monsters.active;
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (m.ghost && !m.visible) continue;
        const frame = Math.floor(m.walkT * 6) % 2;
        const sc = m.def.boss ? 1 : 1;
        drawMonsterEyes(ctx, m.type, ox + m.x * C, oy + m.y * C + 10, m.dir, frame, sc);
        if (m.thief) drawThiefArrow(ctx, m, ox, oy, g.t);
      }
      for (let i = 0; i < n.projectiles.active.length; i++) {
        const p = n.projectiles.active[i];
        if (p.sprite === 'coin' || p.sprite === 'frost') drawProjectile(ctx, p, ox, oy, true);
      }
    }
    if (o.afterLight) o.afterLight(ctx, ox, oy);
  }

  function drawMonsterBody(ctx, m, ox, oy, t) {
    const frame = Math.floor(m.walkT * 6) % 2;
    const s = monsterSprite(m, frame);
    const x = ox + m.x * C;
    const y = oy + m.y * C + 10;
    if (m.ghost) ctx.globalAlpha = 0.85;
    sprites.blit(ctx, s, x, y);
    if (m.hitT > 0) {
      // Grignotin blanc pendant 60 ms (G20.6).
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = P.blanc;
      const L = MONSTER_LOOK[m.type] || MONSTER_LOOK.raton;
      ctx.beginPath();
      ctx.arc(x, y - L.r - (L.fly || 0), L.r * 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (m.def.golden && Math.floor(t * 10) % 2 === 0) disc(ctx, x + 8, y - 26, 2, P.orReflet, 0);
    if (m.stunT > 0) {
      for (let k = 0; k < 3; k++) {
        const a = t * 6 + k * 2.1;
        disc(ctx, x + Math.cos(a) * 9, y - 30 + Math.sin(a) * 3, 2, P.craieJaune, 0);
      }
    }
  }

  /** Flèche rouge pulsante au-dessus du voleur : dessinée APRÈS le voile de nuit, comme les yeux (P1, Léa). */
  function drawThiefArrow(ctx, m, ox, oy, t) {
    const x = ox + m.x * C;
    const y = oy + m.y * C + 10;
    const L = MONSTER_LOOK[m.type] || MONSTER_LOOK.raton;
    const by = y - L.r * 2.6 - (L.fly || 0) - 6 - Math.abs(Math.sin(t * 6)) * 4;
    ctx.fillStyle = P.danger;
    ctx.strokeStyle = P.encre;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, by - 9);
    ctx.lineTo(x + 8, by - 9);
    ctx.lineTo(x, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawAura(ctx, g, ox, oy) {
    const n = g.night;
    const r = n.auraRadius * C;
    const pulse = 1 + Math.sin(g.t * 4) * 0.04;
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -g.t * 12;
    ctx.strokeStyle = 'rgba(242,246,238,.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox + g.player.x * C, oy + g.player.y * C, r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  return {
    draw,
    invalidate() {
      shellKey = '';
    },
    sprites,
    lighting,
    stats,
    toPx(g, x, y) {
      return { x: g.grid.origin.x + x * C, y: g.grid.origin.y + y * C };
    },
  };
}
