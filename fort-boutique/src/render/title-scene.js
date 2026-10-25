// Fort Boutique — scène animée de l'écran titre (v1.1, V7) : ciel du soir, 40 étoiles, lune et halo, deux plans de
// toits de Bourg-Lanterne en parallaxe, la façade (render/facade.js) et sa vie (lucioles, feuilles ou neige selon la
// saison, yeux dans le buisson, un raton qui passe la tête), l'enseigne qui tombe et ouvre les yeux, l'étiquette
// « Touche pour jouer » suspendue sous l'auvent. Entrée en 1,6 s : la caméra descend du ciel jusqu'à la façade.
import { PALETTE as P } from '../data/palette.js';
import { rr, fillInk, disc } from './sprites/draw.js';
import { drawFacade, drawSign, drawCrate, drawSleepingCat, drawBush, hash01, FACADE } from './facade.js';

const ENTRY_S = 1.6;
const ease = (k) => 1 - (1 - Math.max(0, Math.min(1, k))) ** 3;

/** Rebond d'une chute (0 → 1, avec un petit rebond à la fin). */
function bounce(k) {
  const x = Math.max(0, Math.min(1, k));
  if (x < 0.7) return (x / 0.7) ** 2;
  const b = (x - 0.7) / 0.3;
  return 1 - Math.sin(b * Math.PI) * 0.08;
}

/** Zones tactiles de l'écran titre (pixels logiques). */
export const TITLE_HITS = { sound: { x: 268, y: 590, r: 22 }, gear: { x: 322, y: 590, r: 22 } };

/** Toits : une bande de silhouettes, dessinée une fois. */
function roofStrip(seed, h, color) {
  const out = [];
  let x = 0;
  let i = 0;
  while (x < 720) {
    const w = 46 + hash01(seed + i) * 50;
    const top = h - 30 - hash01(seed + i * 2.3) * 60;
    out.push({ x, w, top, peak: hash01(seed + i * 5.1) > 0.45, chimney: hash01(seed + i * 9.7) > 0.6 });
    x += w - 2;
    i++;
  }
  return { parts: out, color };
}

function drawRoofs(ctx, strip, offset, baseY) {
  ctx.fillStyle = strip.color;
  for (const r of strip.parts) {
    for (const k of [0, 720]) {
      const x = ((r.x - offset) % 720 + 720) % 720 - 40 + k - 720;
      if (x > 400 || x + r.w < -40) continue;
      ctx.beginPath();
      if (r.peak) {
        ctx.moveTo(x, baseY);
        ctx.lineTo(x, r.top + 18);
        ctx.lineTo(x + r.w / 2, r.top - 8);
        ctx.lineTo(x + r.w, r.top + 18);
        ctx.lineTo(x + r.w, baseY);
      } else ctx.rect(x, r.top, r.w, baseY - r.top);
      ctx.fill();
      if (r.chimney) ctx.fillRect(x + r.w * 0.7, r.top - 16, 9, 20);
      // Fenêtres allumées çà et là.
      if (hash01(r.x) > 0.5) {
        ctx.fillStyle = 'rgba(255, 210, 122, 0.55)';
        ctx.fillRect(x + r.w * 0.3, r.top + 30, 7, 9);
        ctx.fillStyle = strip.color;
      }
    }
  }
}

/**
 * @param {{ season?: string | null, title?: string[], tap?: string, version?: string }} o
 */
export function createTitleScene(o = {}) {
  const far = roofStrip(11, 440, '#3B2F6E');
  const near = roofStrip(37, 470, '#4E3D82');
  const stars = Array.from({ length: 40 }, (_, i) => ({ x: hash01(i * 3.3) * 360, y: 20 + hash01(i * 7.1) * 300, r: 0.8 + hash01(i * 1.7) * 1.4, ph: hash01(i * 4.4) * 6 }));
  const flies = Array.from({ length: 12 }, (_, i) => ({ x: hash01(i * 13.1) * 360, y: 330 + hash01(i * 5.9) * 220, ph: hash01(i * 2.2) * 6 }));
  const flakes = Array.from({ length: 22 }, (_, i) => ({ x: hash01(i * 17.3) * 360, y: hash01(i * 3.9) * 640, v: 18 + hash01(i * 8.8) * 22, ph: hash01(i * 6.6) * 6 }));
  const s = {
    t: 0,
    door: 0,
    opening: false,
    eyesNext: 4.5,
    eyesT: 0,
    raccoonT: -1,
    soundOn: true,
    update(dt) {
      s.t += dt;
      if (s.opening) s.door = Math.min(1, s.door + dt / 0.35);
      // Yeux du buisson : toutes les 4 à 6 s ; le raton passe la tête une fois, vers 7 s.
      s.eyesNext -= dt;
      if (s.eyesNext <= 0) {
        s.eyesT = 1.1;
        s.eyesNext = 4 + hash01(s.t) * 2;
      }
      s.eyesT = Math.max(0, s.eyesT - dt);
      if (s.raccoonT < 0 && s.t > 7) s.raccoonT = 0;
      if (s.raccoonT >= 0 && s.raccoonT < 1) s.raccoonT = Math.min(1, s.raccoonT + dt / 1.6);
    },
    /** @param {CanvasRenderingContext2D} ctx */
    draw(ctx) {
      const t = s.t;
      const k = ease(t / ENTRY_S);
      // La caméra descend du ciel (le décor monte de 360 px vers sa place).
      const cam = (1 - k) * -360;
      // Ciel du soir.
      const sky = ctx.createLinearGradient(0, 0, 0, 480);
      sky.addColorStop(0, '#2A2466');
      sky.addColorStop(0.62, '#7A4E8E');
      sky.addColorStop(1, '#F59E6B');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 360, 640);
      ctx.save();
      ctx.translate(0, -cam * 0.3);
      for (const st of stars) {
        ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + st.ph));
        disc(ctx, st.x, st.y, st.r, '#FFF6C8', 0);
      }
      ctx.globalAlpha = 1;
      // Lune et halo.
      const halo = ctx.createRadialGradient(300, 70, 10, 300, 70, 70);
      halo.addColorStop(0, 'rgba(255, 243, 176, 0.45)');
      halo.addColorStop(1, 'rgba(255, 243, 176, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(230, 0, 140, 140);
      disc(ctx, 300, 70, 22, P.lune, 2.5);
      disc(ctx, 293, 64, 5, '#FFE48A', 0);
      disc(ctx, 307, 78, 3.5, '#FFE48A', 0);
      ctx.restore();
      ctx.save();
      ctx.translate(0, -cam);
      // Toits en parallaxe (très lents).
      drawRoofs(ctx, far, t * 4, 470);
      drawRoofs(ctx, near, t * 9, 490);
      // Trottoir et rue.
      ctx.fillStyle = '#5E4A6E';
      ctx.fillRect(0, FACADE.base - 4, 360, 200);
      ctx.fillStyle = '#7A6488';
      ctx.fillRect(0, FACADE.base - 4, 360, 40);
      ctx.fillStyle = 'rgba(43, 26, 51, 0.35)';
      for (let x = 0; x < 360; x += 40) ctx.fillRect(x, FACADE.base + 2, 2, 34);
      // Façade, lanternes allumées une à une, porte qui s'ouvre au tap.
      const lan = [Math.min(1, Math.max(0, (t - 1.0) / 0.15)), Math.min(1, Math.max(0, (t - 1.2) / 0.15))];
      drawFacade(ctx, { t, day: false, lanterns: lan, door: s.door });
      drawCrate(ctx, 82, 486);
      drawSleepingCat(ctx, FACADE.doorX + FACADE.doorW / 2, FACADE.base + 18, t);
      drawBush(ctx, 8, 470, t, s.eyesT > 0 ? Math.min(1, s.eyesT / 0.2, (1.1 - s.eyesT) / 0.15 + 0.3) : 0, s.raccoonT >= 0 && s.raccoonT < 1 ? s.raccoonT : 0);
      // Enseigne : elle tombe et rebondit, puis ses yeux s'ouvrent et regardent à gauche, puis à droite.
      const drop = bounce((t - 0.55) / 0.85);
      const signY = FACADE.signY - (1 - drop) * 260;
      const eyes = Math.max(0, Math.min(1, (t - 1.45) / 0.25));
      const look = t < 2.4 ? 0 : Math.sin((t - 2.4) * 0.9) > 0 ? 1 : -1;
      drawSign(ctx, { x: 180, y: signY, eyes, look: look * Math.min(1, eyes), title: o.title || ['Fort', 'Boutique'] });
      // Étiquette « Touche pour jouer » suspendue sous l'auvent (±2,5°, 2,4 s ; pulsation ×1 → ×1,04).
      if (t > 1.2 && !s.opening) {
        const a = (Math.sin((t * Math.PI * 2) / 2.4) * 2.5 * Math.PI) / 180;
        const pulse = 1 + 0.02 * (1 + Math.sin(t * 3));
        ctx.save();
        ctx.globalAlpha = Math.min(1, (t - 1.2) / 0.3);
        ctx.translate(180, FACADE.awningY + 34);
        ctx.rotate(a);
        ctx.strokeStyle = P.encre;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(0, 26);
        ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.translate(0, 26);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
        rr(ctx, -78, 3, 156, 38, 9);
        ctx.fill();
        rr(ctx, -78, 0, 156, 38, 9);
        fillInk(ctx, P.kraft, 3);
        disc(ctx, -64, 19, 4, P.encre, 0);
        ctx.fillStyle = P.encre;
        ctx.font = '900 17px ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.tap || 'Touche pour jouer', 6, 20);
        ctx.restore();
      }
      ctx.restore();
      // Lucioles.
      for (const f of flies) {
        const fx = f.x + Math.sin(t * 0.7 + f.ph) * 18;
        const fy = f.y + Math.cos(t * 0.9 + f.ph * 1.3) * 12 - cam;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + f.ph));
        const gl = ctx.createRadialGradient(fx, fy, 0, fx, fy, 9);
        gl.addColorStop(0, `rgba(255, 240, 140, ${0.7 * a})`);
        gl.addColorStop(1, 'rgba(255, 240, 140, 0)');
        ctx.fillStyle = gl;
        ctx.fillRect(fx - 9, fy - 9, 18, 18);
        disc(ctx, fx, fy, 1.6, '#FFF6C8', 0);
      }
      // Feuilles, citrouilles (Halloween) ou neige (hiver).
      const season = o.season || null;
      for (const f of flakes) {
        const y = (f.y + t * f.v) % 680 - 20;
        const x = f.x + Math.sin(t + f.ph) * 14;
        if (season === 'winter') disc(ctx, x, y, 2.4, '#FFFFFF', 0);
        else if (season === 'halloween') {
          ctx.beginPath();
          ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
          fillInk(ctx, '#FF8A3D', 1.4);
        } else {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(t * 1.5 + f.ph);
          ctx.beginPath();
          ctx.ellipse(0, 0, 5, 2.4, 0, 0, Math.PI * 2);
          fillInk(ctx, f.ph > 3 ? '#E8833A' : '#F2B64B', 1.2);
          ctx.restore();
        }
      }
      // En bas, discrets : version, son et paramètres, en bois.
      ctx.fillStyle = 'rgba(242, 246, 238, 0.55)';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.version || '', 14, 600);
      woodButton(ctx, TITLE_HITS.sound, (c, x, y) => speaker(c, x, y, s.soundOn));
      woodButton(ctx, TITLE_HITS.gear, (c, x, y) => cog(c, x, y));
      // Porte ouverte : la lumière chaude envahit l'écran.
      if (s.door > 0) {
        const r = 40 + s.door * 700;
        const cx = FACADE.doorX + FACADE.doorW / 2;
        const cy = 390;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(255, 226, 150, ${0.95 * s.door})`);
        g.addColorStop(0.6, `rgba(255, 200, 110, ${0.7 * s.door})`);
        g.addColorStop(1, 'rgba(255, 200, 110, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 360, 640);
      }
    },
  };
  return s;
}

function woodButton(ctx, b, icon) {
  ctx.fillStyle = 'rgba(43, 26, 51, 0.25)';
  ctx.beginPath();
  ctx.arc(b.x, b.y + 3, 17, 0, Math.PI * 2);
  ctx.fill();
  disc(ctx, b.x, b.y, 17, P.bois, 2.5);
  ctx.strokeStyle = P.boisFonce;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 11, 0.3, 2.4);
  ctx.stroke();
  icon(ctx, b.x, b.y);
}

function speaker(ctx, x, y, on) {
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 4);
  ctx.lineTo(x - 4, y - 4);
  ctx.lineTo(x + 1, y - 9);
  ctx.lineTo(x + 1, y + 9);
  ctx.lineTo(x - 4, y + 4);
  ctx.lineTo(x - 8, y + 4);
  ctx.closePath();
  fillInk(ctx, P.orReflet, 1.6);
  ctx.strokeStyle = P.encre;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (on) {
    ctx.arc(x + 2, y, 6, -0.9, 0.9);
    ctx.moveTo(x + 4, y - 9);
    ctx.arc(x + 2, y, 10, -0.9, 0.9);
  } else {
    ctx.moveTo(x + 4, y - 4);
    ctx.lineTo(x + 10, y + 4);
    ctx.moveTo(x + 10, y - 4);
    ctx.lineTo(x + 4, y + 4);
  }
  ctx.stroke();
}

function cog(ctx, x, y) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 7.5 : 10;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  fillInk(ctx, P.orReflet, 1.6);
  disc(ctx, x, y, 3, P.bois, 1.6);
}
