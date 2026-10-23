// Fort Boutique — le hub du Matin (v1.1, V8) : la boutique vue de la rue, en plein jour. Dessin pur sur canvas :
// ciel du matin et lune pâle, toits, façade (render/facade.js) avec l'intérieur réel du joueur dans la vitrine,
// objets du monde (ardoise, calendrier, boîte aux lettres, poteau de rue, Moka sur l'auvent) et l'établi en bas
// (catalogue, boîte à outils, rouleau de plan bleu). Les zones de tap et les étiquettes sont en DOM (screens/morning.js).
import { PALETTE as P } from '../data/palette.js';
import { rr, fillInk, disc } from './sprites/draw.js';
import { drawFacade, drawSign, hash01, FACADE } from './facade.js';
import { drawFurniture } from './sprites/furniture.js';
import { FURNITURE, footprint } from '../data/furniture.js';
import { drawStaff } from './sprites/helpers.js';

/** Emplacements des objets du hub (pixels logiques) : la même table sert aux zones de tap DOM. */
export const HUB_OBJECTS = {
  level: { x: 8, y: 8, w: 58, h: 58 },
  money: { x: 112, y: 4, w: 136, h: 50 },
  gear: { x: 314, y: 6, w: 40, h: 40 },
  moon: { x: 306, y: 54, w: 48, h: 48 },
  map: { x: 6, y: 300, w: 44, h: 150 },
  calendar: { x: 162, y: 306, w: 28, h: 34 },
  wardrobe: { x: 252, y: 226, w: 52, h: 40 },
  quests: { x: 58, y: 424, w: 64, h: 62 },
  daily: { x: 318, y: 386, w: 40, h: 96 },
  open: { x: 214, y: 296, w: 74, h: 174 },
  catalog: { x: 22, y: 540, w: 92, h: 64 },
  upgrades: { x: 134, y: 536, w: 92, h: 68 },
  plans: { x: 246, y: 540, w: 92, h: 64 },
};

/** Intérieur réel du joueur, vu de dessus en miniature dans la vitrine (meubles, personnel, Moka). */
function interior(g) {
  return (ctx, x, y, w, h) => {
    const shop = g.shop;
    const gw = g.grid ? g.grid.w : 5;
    const gh = g.grid ? g.grid.h : 6;
    const cs = Math.min(w / gw, h / gh);
    const ox = x + (w - gw * cs) / 2;
    const oy = y + (h - gh * cs) / 2;
    ctx.fillStyle = 'rgba(226, 169, 78, 0.55)';
    ctx.fillRect(ox, oy, gw * cs, gh * cs);
    const k = cs / 48;
    const items = shop.layout.slice().sort((a, b) => a.y - b.y);
    for (const it of items) {
      const def = FURNITURE[it.id];
      if (!def) continue;
      const [fw, fh] = footprint(def, it.rot || 0);
      ctx.save();
      ctx.translate(ox + it.x * cs, oy + it.y * cs);
      ctx.scale(k, k);
      drawFurniture(ctx, it.id, 0, 0, fw * 48, fh * 48, { night: 0, lookX: 0, lookY: 1, stock: 2, product: null, count: 0, cap: 4 });
      ctx.restore();
    }
    // Le personnel à son poste (petit), et Moka.
    const st = shop.staff || {};
    const people = [];
    if (st.cashier) people.push({ kind: 'cashier', x: 3.5, y: gh - 0.5 });
    if (st.cashier2) people.push({ kind: 'cashier', x: 4.5, y: gh - 0.5 });
    (st.clerks || []).forEach((c, i) => people.push({ kind: 'clerk', x: 0.5 + i * 0.6, y: gh - 0.5 }));
    for (const s of people) {
      ctx.save();
      ctx.translate(ox + s.x * cs, oy + s.y * cs);
      ctx.scale(k * 1.2, k * 1.2);
      drawStaff(ctx, { kind: s.kind, apron: g.district && g.district.accent }, 0);
      ctx.restore();
    }
  };
}

/** Moka assis sur l'auvent : il agite la queue (et miaule quand la Garde-robe a du neuf). */
function drawAwningCat(ctx, x, y, t, wag) {
  const tail = Math.sin(t * (wag ? 6 : 1.8)) * (wag ? 0.6 : 0.3);
  ctx.save();
  ctx.translate(x + 10, y - 4);
  ctx.rotate(tail);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(12, 4, 14, 16);
  ctx.stroke();
  ctx.strokeStyle = '#F08A3C';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 11, 12, 0, 0, Math.PI * 2);
  fillInk(ctx, '#F08A3C', 2.5);
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 24, 10, 9, 0, 0, Math.PI * 2);
  fillInk(ctx, '#F08A3C', 2.5);
  for (const ex of [-9, 3]) {
    ctx.beginPath();
    ctx.moveTo(x + ex, y - 30);
    ctx.lineTo(x + ex + 2, y - 38);
    ctx.lineTo(x + ex + 6, y - 31);
    ctx.closePath();
    fillInk(ctx, '#F08A3C', 2);
  }
  disc(ctx, x - 6, y - 25, 1.6, P.encre, 0);
  disc(ctx, x + 2, y - 25, 1.6, P.encre, 0);
  disc(ctx, x - 2, y - 21.5, 1.1, '#FF8FB1', 0);
}

/** Ardoise sur le trottoir : points de craie = avancée des quêtes ; étoile de craie si une récompense attend. */
function drawSlate(ctx, o, t, dots, star) {
  const { x, y, w, h } = o;
  ctx.strokeStyle = P.boisFonce;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h);
  ctx.lineTo(x + w / 2, y + 4);
  ctx.lineTo(x + w - 10, y + h);
  ctx.stroke();
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  rr(ctx, x + 6, y + 9, w - 8, h - 22, 5);
  ctx.fill();
  rr(ctx, x + 3, y + 6, w - 6, h - 22, 5);
  fillInk(ctx, P.bois, 2.5);
  rr(ctx, x + 8, y + 11, w - 16, h - 32, 3);
  fillInk(ctx, P.ardoise, 2);
  ctx.fillStyle = P.craie;
  for (let i = 0; i < 3; i++) {
    const on = i < dots;
    ctx.globalAlpha = on ? 0.95 : 0.3;
    disc(ctx, x + 18 + i * 13, y + 24, on ? 3.2 : 2.2, P.craie, 0);
  }
  ctx.globalAlpha = 1;
  if (star) {
    const s = 1 + Math.sin(t * 5) * 0.12;
    ctx.save();
    ctx.translate(x + w / 2, y + 38);
    ctx.scale(s, s);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 3.5 : 8;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = P.craieJaune;
    ctx.fill();
    ctx.restore();
  }
}

/** Calendrier accroché dans la vitrine ; la page du jour se soulève quand elle attend. */
function drawCalendar(ctx, o, t, lift) {
  const { x, y, w, h } = o;
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  ctx.fillRect(x + 3, y + 3, w, h);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  fillInk(ctx, P.ticket, 2);
  ctx.fillStyle = P.etiquetteCorail;
  ctx.fillRect(x + 1, y + 1, w - 2, 8);
  ctx.fillStyle = P.encre;
  ctx.font = '900 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(new Date().getUTCDate()), x + w / 2, y + 22);
  if (lift) {
    const a = 0.25 + Math.sin(t * 4) * 0.15;
    ctx.save();
    ctx.translate(x + w, y + h);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12 * (1 + a), 0);
    ctx.lineTo(0, -12 * (1 + a));
    ctx.closePath();
    fillInk(ctx, '#FFF6C8', 1.6);
    ctx.restore();
  }
}

/** Boîte aux lettres : le petit drapeau rouge est levé quand le Défi du jour attend. */
function drawMailbox(ctx, o, t, flag) {
  const { x, y, w, h } = o;
  ctx.fillStyle = P.boisFonce;
  ctx.fillRect(x + w / 2 - 3, y + 40, 6, h - 40);
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  rr(ctx, x + 4, y + 8, w - 4, 38, 12);
  ctx.fill();
  rr(ctx, x + 2, y + 4, w - 4, 38, 12);
  fillInk(ctx, '#5B7CFA', 2.5);
  ctx.fillStyle = P.encre;
  rr(ctx, x + 10, y + 16, w - 20, 5, 2);
  ctx.fill();
  const a = flag ? -Math.PI / 2 + Math.sin(t * 3) * 0.08 : 0;
  ctx.save();
  ctx.translate(x + w - 4, y + 30);
  ctx.rotate(a);
  ctx.fillStyle = P.encre;
  ctx.fillRect(-1.5, -16, 3, 16);
  ctx.beginPath();
  ctx.rect(-1.5, -16, 12, 8);
  fillInk(ctx, '#FF4F5E', 1.6);
  ctx.restore();
}

/** Poteau de rue et ses flèches (vers les quartiers) ; une flèche clignote si un quartier s'ouvre. */
function drawSignpost(ctx, o, t, blink) {
  const { x, y, w, h } = o;
  const cx = x + w / 2;
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  ctx.fillRect(cx - 1, y + 12, 7, h - 10);
  ctx.beginPath();
  ctx.rect(cx - 4, y + 8, 7, h - 8);
  fillInk(ctx, P.boisFonce, 2.5);
  const arrows = [[y + 22, 1, '#FF9F43'], [y + 50, -1, '#9B5DE5'], [y + 78, 1, '#4D96FF']];
  arrows.forEach(([ay, dir, col], i) => {
    const on = blink && i === 0 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 6)) : 1;
    ctx.save();
    ctx.globalAlpha = on;
    ctx.translate(cx, ay);
    ctx.scale(dir, 1);
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(20, -8);
    ctx.lineTo(28, 0);
    ctx.lineTo(20, 8);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    fillInk(ctx, col, 2.2);
    ctx.restore();
  });
}

/** Établi en bois en bas de l'écran, avec le catalogue, la boîte à outils et le rouleau de plan bleu. */
function drawWorkbench(ctx, t) {
  const y = 556;
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  ctx.fillRect(4, y + 6, 356, 90);
  ctx.beginPath();
  ctx.rect(0, y, 360, 84);
  fillInk(ctx, P.bois, 3);
  ctx.strokeStyle = P.boisFonce;
  ctx.lineWidth = 2;
  for (const yy of [y + 24, y + 54]) {
    ctx.beginPath();
    ctx.moveTo(6, yy);
    ctx.bezierCurveTo(120, yy - 3, 240, yy + 3, 354, yy);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 40; i++) ctx.fillRect(hash01(i + 200) * 350, y + 4 + hash01(i + 300) * 76, 12 + hash01(i) * 30, 1.5);
  ctx.globalAlpha = 1;
  // Catalogue : livret ouvert.
  const c = HUB_OBJECTS.catalog;
  const bx = c.x + 6;
  const by = c.y + 4;
  for (const [dx, rot] of [[0, -0.08], [38, 0.08]]) {
    ctx.save();
    ctx.translate(bx + dx + 20, by + 20);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.rect(-20, -18, 40, 36);
    fillInk(ctx, P.ticket, 2.2);
    ctx.fillStyle = 'rgba(43, 26, 51, 0.35)';
    for (let k = 0; k < 3; k++) ctx.fillRect(-13, -9 + k * 8, 26, 2);
    ctx.restore();
  }
  ctx.fillStyle = P.etiquetteCorail;
  ctx.fillRect(bx + 52, by - 6, 7, 14);
  // Boîte à outils.
  const u = HUB_OBJECTS.upgrades;
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(u.x + 46, u.y + 16, 14, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  rr(ctx, u.x + 10, u.y + 16, 72, 36, 6);
  fillInk(ctx, '#FF4F5E', 2.5);
  ctx.fillStyle = P.encre;
  ctx.fillRect(u.x + 10, u.y + 28, 72, 3);
  disc(ctx, u.x + 46, u.y + 30, 4, P.or, 1.6);
  // Rouleau de plan bleu.
  const pl = HUB_OBJECTS.plans;
  ctx.save();
  ctx.translate(pl.x + 46, pl.y + 30);
  ctx.rotate(-0.12 + Math.sin(t * 1.2) * 0.02);
  ctx.beginPath();
  rr(ctx, -38, -12, 76, 24, 11);
  fillInk(ctx, '#4D96FF', 2.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.6;
  for (const xx of [-20, 0, 20]) {
    ctx.beginPath();
    ctx.moveTo(xx, -10);
    ctx.lineTo(xx, 10);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(38, 0, 6, 12, 0, 0, Math.PI * 2);
  fillInk(ctx, '#7FB8FF', 2);
  ctx.restore();
}

/**
 * La scène complète.
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} g partie
 * @param {{ t: number, signals: Record<string, any>, title: string[] }} o
 */
export function drawHubScene(ctx, g, o) {
  const t = o.t;
  const sig = o.signals || {};
  // Ciel du matin.
  const sky = ctx.createLinearGradient(0, 0, 0, 470);
  sky.addColorStop(0, '#9FDBFF');
  sky.addColorStop(1, '#FFE9C2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 360, 640);
  // Lune pâle du matin (nuits restantes avant la Pleine Lune).
  const m = HUB_OBJECTS.moon;
  ctx.globalAlpha = 0.85;
  disc(ctx, m.x + m.w / 2, m.y + m.h / 2, 17, '#FFFBEA', 2.2);
  ctx.globalAlpha = 1;
  // Nuages.
  for (let i = 0; i < 3; i++) {
    const cx = ((hash01(i + 40) * 360 + t * (4 + i * 2)) % 440) - 40;
    const cy = 80 + i * 30;
    ctx.globalAlpha = 0.85;
    for (const [dx, r] of [[0, 14], [14, 18], [30, 13]]) disc(ctx, cx + dx, cy, r, '#FFFFFF', 0);
    ctx.globalAlpha = 1;
  }
  // Toits du quartier, en clair.
  ctx.fillStyle = '#B9C8EE';
  for (let i = 0; i < 9; i++) {
    const x = i * 44 - 10;
    const top = 380 + hash01(i * 3.7) * 40;
    ctx.beginPath();
    ctx.moveTo(x, 470);
    ctx.lineTo(x, top + 14);
    ctx.lineTo(x + 22, top - 6);
    ctx.lineTo(x + 44, top + 14);
    ctx.lineTo(x + 44, 470);
    ctx.fill();
  }
  // Trottoir.
  ctx.fillStyle = '#D9C3A5';
  ctx.fillRect(0, FACADE.base - 4, 360, 100);
  ctx.fillStyle = 'rgba(43, 26, 51, 0.12)';
  for (let x = 0; x < 360; x += 40) ctx.fillRect(x, FACADE.base + 2, 2, 60);
  drawSignpost(ctx, HUB_OBJECTS.map, t, !!sig.mapBlink);
  drawFacade(ctx, { t, day: true, lanterns: [0, 0], door: sig.doorGlow ? 0 : 0, interior: interior(g) });
  // La porte luit doucement : c'est l'action principale.
  const d = HUB_OBJECTS.open;
  const glow = 0.25 + 0.15 * Math.sin(t * 2.4);
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.strokeStyle = '#FFF3B0';
  ctx.lineWidth = 6;
  rr(ctx, d.x - 8, d.y - 8, d.w + 16, d.h + 6, 12);
  ctx.stroke();
  ctx.restore();
  // Panneau « Fermé » qui se balance sur la porte.
  ctx.save();
  ctx.translate(d.x + d.w / 2, d.y + 74);
  ctx.rotate(Math.sin(t * 2) * 0.06);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(0, -16);
  ctx.lineTo(14, -8);
  ctx.stroke();
  rr(ctx, -26, -8, 52, 18, 4);
  fillInk(ctx, '#FF6B6B', 2.2);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(o.closed || 'FERMÉ', 0, 1.5);
  ctx.restore();
  drawCalendar(ctx, HUB_OBJECTS.calendar, t, !!sig.calendar);
  drawSign(ctx, { x: 180, y: FACADE.signY, eyes: 1, look: Math.sin(t * 0.6) > 0.3 ? 1 : Math.sin(t * 0.6) < -0.3 ? -1 : 0, title: o.title || ['Fort', 'Boutique'] });
  const w = HUB_OBJECTS.wardrobe;
  if (sig.wardrobeShown) drawAwningCat(ctx, w.x + w.w / 2, w.y + w.h - 2, t, !!sig.wardrobe);
  drawSlate(ctx, HUB_OBJECTS.quests, t, sig.questDots || 0, !!sig.quests);
  drawMailbox(ctx, HUB_OBJECTS.daily, t, !!sig.daily);
  drawWorkbench(ctx, t);
}
