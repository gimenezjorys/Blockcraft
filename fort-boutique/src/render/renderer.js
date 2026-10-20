// Fort Boutique — rendu principal : coque de la boutique en cache, meubles pré-rendus, tri par profondeur.
import { PALETTE as P } from '../data/palette.js';
import { SpriteCache } from './sprites/draw.js';
import { drawShopShell, drawBackdrop, drawPad } from './sprites/shop.js';
import { drawFurniture } from './sprites/furniture.js';
import { drawMerchant, drawCustomer } from './sprites/characters.js';

const C = 48;

/**
 * @param {{ makeCanvas: (w: number, h: number) => HTMLCanvasElement, pixelScale: () => number }} env
 */
export function createRenderer(env) {
  let shell = null;
  let shellKey = '';
  let spriteScale = 2;
  const sprites = new SpriteCache(env.makeCanvas, spriteScale);
  /** Liste réutilisée des éléments à trier. */
  const drawList = [];
  const pool = [];
  let poolN = 0;
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
    if (key === shellKey && shell) return;
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
  }

  function furnitureSprite(f, night) {
    const w = f.w * C;
    const h = f.h * C;
    const eyesQ = f.eyes > 0 ? Math.round(f.eyes * 4) : 0;
    const look = f.eyes > 0.4 ? Math.round(((Math.atan2(f.lookY, f.lookX) + Math.PI) / (Math.PI * 2)) * 8) % 8 : 0;
    const key = `${f.id}|${f.w}${f.h}|${night ? 1 : 0}|${f.product || ''}|${f.count}|${Math.min(f.stock, 9)}|${eyesQ}|${look}|${f.broken ? 1 : 0}|${f.capacity || 0}|${f.jarQ ?? ''}`;
    return sprites.get(key, w + 8, h + 24, 4, 20, (ctx) => {
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

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {any} g partie
   * @param {{ night?: boolean, t?: number }} [o]
   */
  function draw(ctx, g, o = {}) {
    const night = !!o.night;
    ensureShell(g, night);
    drawBackdrop(ctx);
    ctx.drawImage(shell, 0, 0, 360, 640);
    const ox = g.grid.origin.x;
    const oy = g.grid.origin.y;
    // Emplacements d'achat.
    if (g.day && g.day.pad) {
      const pad = g.day.pad;
      drawPad(ctx, ox + pad.x * C, oy + pad.y * C, C, pad.paid / pad.price, g.t);
    }
    drawList.length = 0;
    poolN = 0;
    for (const f of g.furn) item('f', f.y + f.h - 0.05, f);
    item('p', g.player.y, g.player);
    if (g.day) for (const c of g.day.customers) item('c', c.y, c);
    drawList.sort(byY);
    for (const d of drawList) {
      if (d.kind === 'f') {
        const f = d.ref;
        const s = furnitureSprite(f, night);
        const jy = f.jump > 0 ? -Math.sin(Math.min(1, f.jump) * Math.PI) * 6 : 0;
        sprites.blit(ctx, s, ox + f.x * C, oy + f.y * C + jy);
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
      }
    }
    if (o.after) o.after(ctx, ox, oy);
  }

  return {
    draw,
    invalidate() {
      shellKey = '';
    },
    sprites,
    /** Pixels logiques d'une position en cases. */
    toPx(g, x, y) {
      return { x: g.grid.origin.x + x * C, y: g.grid.origin.y + y * C };
    },
    palette: P,
  };
}
