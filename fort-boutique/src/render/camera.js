// Fort Boutique — mise à l'échelle 360 × 640 avec bandes latérales (B1) et caméra de jeu.

/** Largeur logique. */
export const LOGICAL_W = 360;
/** Hauteur logique. */
export const LOGICAL_H = 640;

/**
 * Calcule l'échelle et le décalage de la zone logique dans la fenêtre.
 * @param {number} winW
 * @param {number} winH
 * @returns {{ scale: number, offsetX: number, offsetY: number }}
 */
export function computeViewport(winW, winH) {
  const w = Math.max(1, winW || LOGICAL_W);
  const h = Math.max(1, winH || LOGICAL_H);
  const scale = Math.min(w / LOGICAL_W, h / LOGICAL_H);
  return {
    scale,
    offsetX: (w - LOGICAL_W * scale) / 2,
    offsetY: (h - LOGICAL_H * scale) / 2,
  };
}

/**
 * Convertit des coordonnées client en coordonnées logiques.
 * @param {{ scale: number, offsetX: number, offsetY: number }} vp
 * @param {number} cx
 * @param {number} cy
 * @param {{ x: number, y: number }} out
 */
export function clientToLogical(vp, cx, cy, out) {
  out.x = (cx - vp.offsetX) / vp.scale;
  out.y = (cy - vp.offsetY) / vp.scale;
  return out;
}

/**
 * Zoom de base de la boutique : une petite boutique remplit l'écran (P1, Léa : « tout est petit »).
 * Le zoom est ancré en haut au centre (180, 0) : la fenêtre visible reste dans le monde 360 × 640,
 * donc le voile de nuit et le fond couvrent toujours tout l'écran.
 * @param {number} w largeur de la grille (cases)
 * @param {number} h hauteur de la grille (cases)
 */
export function shopZoom(w, h) {
  const shopW = w * 48 + 28;
  const bottom = 80 + h * 48 + 34;
  return Math.max(1, Math.min(1.2, 344 / shopW, 560 / bottom));
}

/** Point de l'écran -> point du monde, pour un zoom de base ancré en (180, 0). */
export function screenToWorld(z, sx, sy, out) {
  out.x = 180 + (sx - 180) / z;
  out.y = sy / z;
  return out;
}

/**
 * Caméra du jeu : secousse et zoom léger (G20.6). Les valeurs sont en pixels logiques.
 */
export class Camera {
  constructor() {
    this.zoom = 1;
    this.targetZoom = 1;
    /** Zoom de base de la boutique (shopZoom) et sa cible (1 au Matin : le hub a besoin du bas de l'écran). */
    this.base = 1;
    this.baseTarget = 1;
    this.shakeAmp = 0;
    this.shakeT = 0;
    this.ox = 0;
    this.oy = 0;
    this.enabledShake = true;
    this.seed = 1;
  }
  /** @param {number} px amplitude (≤ 6 px) @param {number} dur secondes */
  shake(px, dur) {
    if (!this.enabledShake) return;
    this.shakeAmp = Math.max(this.shakeAmp, Math.min(6, px));
    this.shakeT = Math.max(this.shakeT, dur);
  }
  /** @param {number} dt secondes */
  update(dt) {
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      // Bruit déterministe (pas de Math.random dans le rendu non plus).
      this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
      const a = (this.seed / 0x7fffffff) * Math.PI * 2;
      this.ox = Math.cos(a) * this.shakeAmp;
      this.oy = Math.sin(a) * this.shakeAmp;
      if (this.shakeT <= 0) {
        this.shakeAmp = 0;
        this.ox = 0;
        this.oy = 0;
      }
    }
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 10);
    this.base += (this.baseTarget - this.base) * Math.min(1, dt * 5);
  }
}
