// Fort Boutique — lumière et obscurité (G8.1) : les fantômes ne sont visibles et ciblables qu'à la lumière.
import { NIGHT } from '../../data/night.js';

/**
 * Sources de lumière actives (pour la visibilité et pour le calque d'éclairage).
 * @param {any} g
 * @param {Array<{ x: number, y: number, r: number, kind: string }>} out tableau réutilisé
 */
export function lightSources(g, out) {
  let n = putLight(out, 0, g.player.x, g.player.y, NIGHT.merchantLight, 'merchant');
  for (const f of g.furn) {
    if (f.broken) continue;
    const nd = f.def.night;
    if (nd.behavior === 'light' && !(f.doused > 0)) n = putLight(out, n, f.cx, f.cy, nd.lightRadius, 'lantern');
    else if (nd.light) n = putLight(out, n, f.cx, f.cy, nd.light, 'glow');
  }
  out.length = n;
  return out;
}

/** Écrit une source dans le tableau réutilisé ; renvoie le nombre de sources. */
function putLight(out, n, x, y, r, kind) {
  let L = out[n];
  if (!L) {
    L = { x: 0, y: 0, r: 0, kind: '' };
    out[n] = L;
  }
  L.x = x;
  L.y = y;
  L.r = r;
  L.kind = kind;
  return n + 1;
}

/** Met à jour la visibilité des fantômes. @param {any} g */
export function updateVisibility(g) {
  const lights = lightSources(g, g.night.lights);
  const arr = g.night.monsters.active;
  for (let i = 0; i < arr.length; i++) {
    const m = arr[i];
    if (!m.ghost) {
      m.visible = true;
      continue;
    }
    let lit = false;
    for (let k = 0; k < lights.length; k++) {
      const L = lights[k];
      if (Math.hypot(m.x - L.x, m.y - L.y) <= L.r) {
        lit = true;
        break;
      }
    }
    m.visible = lit && !m.hidden;
  }
}
