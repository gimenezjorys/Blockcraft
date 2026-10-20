// Fort Boutique — bots des simulations d'équilibrage (D2.2) : ils pilotent la logique pure (sans DOM).
// Profils : faible (55 %, réaction 600 ms), moyen (75 %), fort (92 %).
import { Rng, seedFrom } from '../../src/core/rng.js';

export const PROFILES = {
  weak: { id: 'weak', efficiency: 0.55, reactionS: 0.6, chase: 0, aura: 'center', bell: false, buy: 'cheapest', layout: 'default' },
  medium: { id: 'medium', efficiency: 0.75, reactionS: 0.35, chase: 0.5, aura: 'nearestPath', bell: 'some', buy: 'priority', layout: 'walls' },
  strong: { id: 'strong', efficiency: 0.92, reactionS: 0.15, chase: 0.9, aura: 'busiest', bell: 'smart', buy: 'optimal', layout: 'optimizer' },
};

const C = (i, w) => ({ x: (i % w) + 0.5, y: Math.floor(i / w) + 0.5 });

/**
 * Pilote du marchand pendant le jour et la nuit.
 * @param {any} profile
 * @param {number} seed
 */
export function createPilot(profile, seed) {
  const rng = new Rng(seedFrom(seed, 'pilote', profile.id));
  const st = { target: null, mode: '', decideT: 0, chaseDecision: new Map(), detour: { x: 0, y: 0, t: 0 } };

  function steer(g, x, y, tol = 0.2) {
    const p = g.player;
    const dx = x - p.x;
    const dy = y - p.y;
    const l = Math.hypot(dx, dy);
    if (l < tol) {
      g.input.x = 0;
      g.input.y = 0;
      return true;
    }
    // Efficacité : le bot ne va pas tout droit (détours) et pas à pleine vitesse.
    const k = profile.efficiency;
    let vx = dx / l;
    let vy = dy / l;
    if (st.detour.t > 0) {
      vx += st.detour.x;
      vy += st.detour.y;
      const m = Math.hypot(vx, vy) || 1;
      vx /= m;
      vy /= m;
    }
    g.input.x = vx * (0.55 + 0.45 * k);
    g.input.y = vy * (0.55 + 0.45 * k);
    return false;
  }

  function dayDecide(g) {
    const p = g.player;
    const d = g.day;
    const w = g.grid.w;
    const shelves = g.furn.filter((f) => f.def.day.kind === 'shelf');
    const producers = g.furn.filter((f) => f.def.day.kind === 'producer');
    if (d.pad && g.save.player.coins >= d.pad.price - d.pad.paid && g.phase.name === 'day') return { x: d.pad.x + 0.5, y: d.pad.y + 0.5, tol: 0.25, mode: 'pad' };
    if (p.stack.length) {
      const fit = shelves
        .filter((s) => s.count < s.capacity && (!s.product || p.stack.includes(s.product)) && s.access >= 0)
        .sort((a, b) => a.count - b.count)[0];
      if (fit && (p.stack.length >= Math.min(4, p.stack.length + producers.reduce((a, f) => a + f.stock, 0)) || st.mode === 'shelf')) {
        const c = C(fit.access, w);
        return { x: c.x, y: c.y, tol: 0.3, mode: 'shelf' };
      }
    }
    if (d.queue.length > 0 || d.pile > 0) {
      const lowShelf = shelves.some((s) => s.count === 0);
      if (!(lowShelf && p.stack.length === 0 && producers.some((f) => f.stock >= 3)) || d.queue.length > 1) {
        return { x: g.register.x + 0.5, y: g.register.y - 0.5, tol: 0.35, mode: 'register' };
      }
    }
    // Producteur dont le produit manque le plus en rayon.
    const need = (prod) => shelves.filter((s) => s.product === prod || !s.product).reduce((a, s) => a + (s.capacity - s.count), 0);
    const prod = producers.filter((f) => f.stock > 0 && f.access >= 0 && need(f.def.day.product) > 0).sort((a, b) => b.stock - a.stock)[0];
    if (prod) {
      const c = C(prod.access, w);
      return { x: c.x, y: c.y, tol: 0.3, mode: 'producer' };
    }
    return { x: g.register.x + 0.5, y: g.register.y - 0.6, tol: 0.4, mode: 'idle' };
  }

  function nightDecide(g) {
    const n = g.night;
    const arr = n.monsters.active;
    // Voleurs : poursuite selon le profil (décision tirée une fois par voleur).
    let best = null;
    let bestD = 1e9;
    for (const m of arr) {
      if (!m.thief || m.entering) continue;
      if (!st.chaseDecision.has(m.id)) st.chaseDecision.set(m.id, rng.chance(profile.chase));
      if (!st.chaseDecision.get(m.id)) continue;
      const dd = Math.hypot(m.x - g.player.x, m.y - g.player.y);
      if (dd < bestD) {
        bestD = dd;
        best = m;
      }
    }
    if (best) return { x: best.x, y: best.y, tol: 0.15, mode: 'chase' };
    if (profile.aura === 'center') return { x: g.grid.w / 2, y: g.grid.h / 2, tol: 0.4, mode: 'center' };
    if (profile.aura === 'busiest' && arr.length) {
      // Barycentre des Grignotins proches de la caisse.
      let sx = 0;
      let sy = 0;
      let k = 0;
      for (const m of arr) {
        if (m.entering) continue;
        const wgt = 1 / (1 + Math.hypot(m.x - g.register.cx, m.y - g.register.cy));
        sx += m.x * wgt;
        sy += m.y * wgt;
        k += wgt;
      }
      if (k > 0) return { x: (sx / k + g.register.cx) / 2, y: (sy / k + g.register.cy) / 2, tol: 0.3, mode: 'busiest' };
    }
    // Moyen : près du meuble le plus proche du chemin des Grignotins (vers la caisse).
    return { x: g.register.x - 0.5, y: g.register.y - 0.5, tol: 0.3, mode: 'guard' };
  }

  return {
    /** À appeler avant chaque pas. */
    tick(g, dt) {
      const name = g.phase.name;
      st.detour.t -= dt;
      if (st.detour.t <= 0 && rng.chance(dt * (1 - profile.efficiency) * 1.5)) {
        const a = rng.next() * Math.PI * 2;
        st.detour = { x: Math.cos(a) * 0.9, y: Math.sin(a) * 0.9, t: 0.4 };
      }
      st.decideT -= dt;
      if (st.decideT <= 0 || !st.target) {
        st.decideT = profile.reactionS;
        if (name === 'day' || name === 'closing') st.target = dayDecide(g);
        else if (name === 'night') st.target = nightDecide(g);
        else st.target = null;
        if (st.target) st.mode = st.target.mode;
      }
      if (name === 'night' && profile.bell && g.night.bellCharge >= g.night.bellNeed) {
        const alive = g.night.monsters.active.length;
        const thieves = g.night.monsters.active.filter((m) => m.thief).length;
        if ((profile.bell === 'smart' && (alive >= 6 || thieves >= 2)) || (profile.bell === 'some' && alive >= 9)) g.input.bell = 1;
      }
      if (!st.target) {
        g.input.x = 0;
        g.input.y = 0;
        return;
      }
      // Une poursuite suit la cible en continu.
      if (st.mode === 'chase') {
        const m = g.night && g.night.monsters.active.find((x) => x.thief && Math.hypot(x.x - st.target.x, x.y - st.target.y) < 1.2);
        if (m) {
          st.target.x = m.x;
          st.target.y = m.y;
        }
      }
      if (steer(g, st.target.x, st.target.y, st.target.tol)) st.decideT = Math.min(st.decideT, 0.05);
    },
    mode: () => st.mode,
  };
}
