// Fort Boutique — robot « au rythme humain » du playtest P2 (D3) : vrais touchers, temps de lecture et de réaction
// sur les écrans, chemins qui contournent les meubles, Commande spéciale, aménagement guidé par la main fantôme.
import { TouchBot } from '../../tests/helpers/bot.js';

const C = 48;
/** Temps humains (ms), fixes : la mesure est reproductible. */
export const HUMAN = {
  title: 1500,
  envelope: 900,
  chestSeen: 1200,
  chestTapGap: 500,
  /** Après la dernière carte sortie. */
  cardsLook: 1200,
  /** Trouver la flèche verte « 4/2 ». */
  upgradeLook: 1800,
  /** Ruban de niveau, confettis : on regarde avant de continuer. */
  levelLook: 3000,
  noLevelLook: 2500,
  unlocksLook: 3500,
  /** Calendrier (M12) : regarder les étiquettes, taper celle du jour, lire les gains. */
  calendarLook: 2500,
  rewardLook: 1500,
  /** Premier Matin : un écran neuf plein de boutons (G19 3:02 → 3:15) ; ensuite on va plus vite. */
  firstMorningLook: 8000,
  morningLook: 5000,
  editorLook: 3000,
  editorAfterMove: 2000,
};

/** Grille occupée d'après l'instantané (meubles posés). */
function occupancy(sc) {
  const { w, h } = sc.grid;
  const occ = new Uint8Array(w * h);
  for (const f of sc.furniture) {
    for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) {
      const x = f.x + dx;
      const y = f.y + dy;
      if (x >= 0 && y >= 0 && x < w && y < h) occ[y * w + x] = 1;
    }
  }
  return occ;
}

/** Prochaine case vers `target` (BFS 4 voisins sur les cases libres). */
function nextCell(sc, occ, from, target) {
  const { w, h } = sc.grid;
  if (from === target) return target;
  const dist = new Int16Array(w * h).fill(-1);
  const q = [target];
  dist[target] = 0;
  while (q.length) {
    const i = q.shift();
    const x = i % w;
    const y = (i / w) | 0;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (dist[j] >= 0 || (occ[j] && j !== from)) continue;
      dist[j] = dist[i] + 1;
      q.push(j);
    }
  }
  if (dist[from] < 0) return target;
  const x = from % w;
  const y = (from / w) | 0;
  let best = target;
  let bd = 1e9;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const j = ny * w + nx;
    if (dist[j] >= 0 && dist[j] < bd) {
      bd = dist[j];
      best = j;
    }
  }
  return best;
}

export class HumanBot extends TouchBot {
  constructor(g, o = {}) {
    super(g, o);
    this.screenT = 0;
    this.prevScreen = '';
    this.step = 0;
    this.stepAt = 0;
    this.onEvent = o.onEvent || (() => {});
    /** Joueur hésitant (mesure des indices) : il attend, s'arrête, ignore le voleur de la nuit 1. */
    this.hesitant = !!o.hesitant;
    this.phaseName = '';
    this.phaseT = 0;
    this.pausedAfterPick = false;
  }

  /** Le joueur hésitant ne fait rien à certains moments (ce que G19 doit rattraper par ses indices). */
  hesitates(sc) {
    if (!this.hesitant || !sc || !sc.save) return false;
    const T = this.phaseT;
    if (sc.phase === 'day' && sc.save.day === 1) {
      if (T < 8000) return true;
      if (sc.player.stack.length && !this.pausedAfterPick) {
        this.pausedAfterPick = T;
        return true;
      }
      if (this.pausedAfterPick && T - this.pausedAfterPick < 6000) return true;
    }
    if (sc.phase === 'night' && sc.save.nights === 0) return true;
    if (sc.phase === 'day' && sc.save.day === 2 && T >= 30000 && T < 36000) return true;
    return false;
  }

  /** Marche en contournant les meubles jusqu'au point (x, y) en cases. */
  walk(sc, x, y, tol = 0.25) {
    const p = sc.player;
    const { w, h } = sc.grid;
    const occ = occupancy(sc);
    const cell = (cx, cy) => Math.max(0, Math.min(h - 1, Math.floor(cy))) * w + Math.max(0, Math.min(w - 1, Math.floor(cx)));
    const from = cell(p.x, p.y);
    const to = cell(x, y);
    if (from === to || Math.hypot(x - p.x, y - p.y) < 0.9) return this.steer(p, x, y, tol);
    const n = nextCell(sc, occ, from, to);
    return this.steer(p, (n % w) + 0.5, ((n / w) | 0) + 0.5, 0.12) && false;
  }

  tick(ms = 100) {
    const st = this.state();
    if (st.screen !== this.prevScreen) {
      this.prevScreen = st.screen;
      this.screenT = 0;
      this.step = 0;
      this.stepAt = 0;
    }
    this.screenT += ms;
    const sc = st.scene;
    const s = st.screen;
    if (sc && sc.phase && sc.phase !== this.phaseName) {
      this.phaseName = sc.phase;
      this.phaseT = 0;
    }
    this.phaseT += ms;
    if (this.hesitates(sc)) {
      this.release();
      this.g.hooks.advance(ms);
      this.t += ms;
      return;
    }
    if (s === 'title') {
      if (this.screenT >= HUMAN.title) this.tapEl('.screen-title');
    } else if (s === 'intro') this.introH();
    else if (s === 'dawn') this.dawnH();
    else if (s === 'unlocks') {
      if (this.screenT >= HUMAN.unlocksLook) this.tapEl('#unlock-ok');
    } else if (s === 'calendar') {
      if (this.screenT >= HUMAN.calendarLook) this.tapEl(this.g.$('#calendar-today') ? '#calendar-today' : '#calendar-close');
    } else if (s === 'reward') {
      if (this.screenT >= HUMAN.rewardLook) this.tapEl('.reward');
    } else if (s === 'morning') this.morningH(sc);
    else if (s === 'editor') this.editorH(st);
    else if (sc && (sc.phase === 'day' || sc.phase === 'closing')) this.dayH(sc);
    else if (sc && sc.phase === 'night') this.nightH(sc);
    else this.release();
    this.g.hooks.advance(ms);
    this.t += ms;
  }

  introH() {
    this.release();
    const env = this.g.$('.intro-envelope');
    if (!env || !env.classList.contains('landed') || env.classList.contains('open')) return;
    if (!this.stepAt) this.stepAt = this.screenT;
    if (this.screenT - this.stepAt >= HUMAN.envelope) this.tapEl(env);
  }

  /** L'aube : on regarde le ticket, on ouvre le coffre (3 taps), on regarde les cartes, on améliore, on fête le niveau. */
  dawnH() {
    this.release();
    const chest = this.g.$('.dawn-chest');
    const T = this.screenT;
    if (chest && !chest.hidden && !chest.classList.contains('open')) {
      if (this.step !== 1) {
        this.step = 1;
        this.stepAt = T + HUMAN.chestSeen - HUMAN.chestTapGap;
        return;
      }
      if (T - this.stepAt >= HUMAN.chestTapGap) {
        this.tapEl(chest);
        this.stepAt = T;
      }
      return;
    }
    const nCards = this.g.$$('.dawn-cards .card').length;
    if (this.step === 1 || (this.step === 2 && nCards !== this.cards)) {
      // Les cartes sortent une à une : on attend la dernière.
      this.step = 2;
      this.stepAt = T;
      this.cards = nCards;
      return;
    }
    if (this.step === 2 && T - this.stepAt < HUMAN.cardsLook) return;
    const up = this.step <= 3 ? this.g.$$('.card-up').find((b) => !b.hidden) : null;
    if (up) {
      if (this.step !== 3) {
        this.step = 3;
        this.stepAt = T;
        return;
      }
      if (T - this.stepAt >= HUMAN.upgradeLook) {
        this.tapEl(up);
        this.onEvent({ type: 'upgrade_tap', at: this.t });
        this.step = 4;
        this.stepAt = T;
      }
      return;
    }
    if (this.step < 4) {
      this.step = 4;
      this.stepAt = T;
    }
    // Un passage de niveau ? On attend le ruban et on le regarde.
    const ribbon = this.g.$('.dawn-level');
    if (ribbon) {
      if (ribbon.hidden) {
        this.stepAt = T;
        return;
      }
      if (T - this.stepAt < HUMAN.levelLook) return;
    } else if (T - this.stepAt < HUMAN.noLevelLook) return;
    const actions = this.g.$('.dawn-actions');
    if (actions && !actions.hidden) this.tapEl('#dawn-continue');
  }

  morningH(sc) {
    this.release();
    if (this.onMorning && this.onMorning(this) === false) return;
    const ed = this.g.$('#hub-editor');
    // G19 6:50 : Aménager brille (pastille) ; un joueur curieux y va.
    if (ed && !ed.classList.contains('locked') && ed.querySelector('.badge-dot')) {
      if (this.screenT >= HUMAN.editorLook) this.tapEl(ed);
      return;
    }
    const look = sc && sc.save && sc.save.cycles <= 1 ? HUMAN.firstMorningLook : HUMAN.morningLook;
    if (this.screenT >= look) this.tapEl('#hub-open');
  }

  editorH(st) {
    this.release();
    const sc = st.scene;
    const T = this.screenT;
    if (this.step === 0 && T >= HUMAN.editorLook) {
      if (sc && sc.hint) {
        const o = sc.grid.origin;
        const a = { x: o.x + (sc.hint.from.x + 0.5) * C, y: o.y + (sc.hint.from.y + 0.5) * C };
        const b = { x: o.x + (sc.hint.to.x + 0.5) * C, y: o.y + (sc.hint.to.y + 0.5) * C };
        const canvas = this.g.$('#game');
        this.g.fingers.start(5, canvas, a.x, a.y);
        this.g.hooks.advance(60);
        for (let i = 1; i <= 8; i++) {
          this.g.fingers.move(5, a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
          this.g.hooks.advance(60);
        }
        this.g.fingers.end(5);
        this.onEvent({ type: 'edit_move', at: this.t });
      }
      this.step = 1;
      this.stepAt = T;
      return;
    }
    if (this.step === 1 && T - this.stepAt >= HUMAN.editorAfterMove) {
      this.tapEl('#ed-validate');
      this.onEvent({ type: 'edit_validate', at: this.t });
      this.step = 2;
    }
  }

  dayH(sc) {
    const p = sc.player;
    const d = sc.day;
    const w = sc.grid.w;
    const coins = sc.coins;
    const center = (i) => ({ x: (i % w) + 0.5, y: Math.floor(i / w) + 0.5 });
    const shelves = sc.furniture.filter((f) => f.kind === 'shelf');
    const producers = sc.furniture.filter((f) => f.kind === 'producer');
    const reg = sc.furniture.find((f) => f.id === 'caisse');
    if (d.pad && coins >= d.pad.price - d.pad.paid && sc.phase === 'day') {
      this.walk(sc, d.pad.x + 0.5, d.pad.y + 0.5, 0.2);
      return;
    }
    // Commande spéciale (G7.7) : on apporte les articles au client du parchemin.
    const o = sc.order;
    if (o && o.waiting && o.timeLeft > 4) {
      const have = p.stack.filter((x) => x === o.product).length;
      if (have >= Math.min(o.need - o.got, 4) || (have > 0 && !producers.some((f) => f.product === o.product && f.stock > 0))) {
        this.walk(sc, o.x, o.y, 0.6);
        return;
      }
      const src = producers.filter((f) => f.product === o.product && f.stock > 0 && f.access >= 0).sort((a, b) => b.stock - a.stock)[0];
      if (src && p.stack.length < 4) {
        const c = center(src.access);
        this.walk(sc, c.x, c.y, 0.3);
        return;
      }
    }
    if (p.stack.length) {
      const fit = shelves
        .filter((s) => s.count < s.capacity && (!s.product || p.stack.includes(s.product)) && s.access >= 0)
        .sort((a, b) => a.count - b.count)[0];
      if (fit && (p.stack.length >= 4 || producers.every((f) => f.stock === 0) || this.mode === 'shelf')) {
        this.mode = 'shelf';
        const c = center(fit.access);
        this.walk(sc, c.x, c.y, 0.3);
        return;
      }
    }
    if (d.queue > 0 || d.pile > 0) {
      const lowShelf = shelves.some((s) => s.count === 0);
      if (!(lowShelf && p.stack.length === 0 && producers.some((f) => f.stock >= 3)) || d.queue > 1) {
        this.mode = 'register';
        const c = center(reg.access);
        this.walk(sc, c.x, c.y, 0.35);
        return;
      }
    }
    const prod = producers.filter((f) => f.stock > 0 && f.access >= 0).sort((a, b) => b.stock - a.stock)[0];
    if (prod) {
      this.mode = 'producer';
      const c = center(prod.access);
      this.walk(sc, c.x, c.y, 0.3);
      return;
    }
    this.mode = 'idle';
    const c = center(reg.access);
    this.walk(sc, c.x, c.y, 0.4);
  }

  nightH(sc) {
    // Joueur passif la nuit (mesure de Hugo, P1/P2) : il ne bouge pas, ne sonne jamais la Cloche.
    if (this.passiveNight) {
      this.release();
      return;
    }
    const p = sc.player;
    const n = sc.night;
    if (n.bellCharge >= n.bellNeed && n.monsters.length >= 4) this.tapCanvas(288, 568);
    const thief = n.monsters.find((m) => m.thief && !m.entering);
    if (thief) {
      this.walk(sc, thief.x, thief.y, 0.15);
      return;
    }
    // Aura du marchand : près du meuble le plus proche des Grignotins (G19 1:49).
    const foes = n.monsters.filter((m) => !m.entering);
    const towers = sc.furniture.filter((f) => f.maxHp > 0 && !f.broken);
    if (foes.length && towers.length) {
      const m = foes[0];
      const t = towers.slice().sort((a, b) => Math.hypot(a.x + 0.5 - m.x, a.y + 0.5 - m.y) - Math.hypot(b.x + 0.5 - m.x, b.y + 0.5 - m.y))[0];
      const spot = t.access >= 0 ? { x: (t.access % sc.grid.w) + 0.5, y: Math.floor(t.access / sc.grid.w) + 0.5 } : { x: t.x + 0.5, y: t.y + 1.5 };
      this.walk(sc, spot.x, spot.y, 0.3);
      return;
    }
    const reg = sc.furniture.find((f) => f.id === 'caisse');
    this.walk(sc, reg.x - 0.5, reg.y - 0.5, 0.3);
  }
}
