// Bot de playtest : joue le build de test avec de VRAIS événements tactiles (joystick, taps),
// en lisant l'état par __FB_TEST__.getState(). Utilisé par les tests d'interface et npm run playtest.

const JOY = { x: 180, y: 560 };
const BELL = { x: 288, y: 568 };

/** Centre d'une case en cases. */
const center = (i, w) => ({ x: (i % w) + 0.5, y: Math.floor(i / w) + 0.5 });

export class TouchBot {
  /**
   * @param {ReturnType<import('./dom.js').loadGame>} g
   * @param {{ reactionMs?: number, efficiency?: number, log?: (ev: any) => void }} [o]
   */
  constructor(g, o = {}) {
    this.g = g;
    this.canvas = g.$('#game');
    this.fingerDown = false;
    this.fingerId = 41;
    this.target = null;
    this.mode = '';
    this.taps = 0;
    this.inertTaps = 0;
    this.log = o.log || (() => {});
    /** Joueur passif la nuit : ne bouge pas, ne sonne jamais la Cloche (mesure P1). */
    this.passiveNight = !!o.passiveNight;
    /** Appelé au Matin avant OUVRIR (audit des boutons du hub). */
    this.onMorning = o.onMorning || null;
    this.t = 0;
    this.lastScreen = '';
  }

  state() {
    return this.g.hooks.getState();
  }

  release() {
    if (this.fingerDown) {
      this.g.fingers.end(this.fingerId);
      this.fingerDown = false;
    }
  }

  /** Oriente le joystick vers (x, y) en cases ; relâche à l'arrivée. */
  steer(p, x, y, tol = 0.18) {
    const dx = x - p.x;
    const dy = y - p.y;
    const l = Math.hypot(dx, dy);
    if (l < tol) {
      this.release();
      return true;
    }
    if (!this.fingerDown) {
      this.g.fingers.start(this.fingerId, this.canvas, JOY.x, JOY.y);
      this.fingerDown = true;
    }
    const k = l < 0.5 ? 18 + 40 * (l / 0.5) : 52;
    this.g.fingers.move(this.fingerId, JOY.x + (dx / l) * k, JOY.y + (dy / l) * k);
    return false;
  }

  /** Tap sur un élément DOM (vrai toucher). */
  tapEl(sel) {
    const el = typeof sel === 'string' ? this.g.$(sel) : sel;
    if (!el) return false;
    this.release();
    this.g.fingers.tap(el, 180, 320, 90 + (this.taps++ % 5));
    return true;
  }

  /** Tap sur le canvas (bouton du HUD) avec un second doigt. */
  tapCanvas(x, y) {
    this.g.fingers.start(7, this.canvas, x, y);
    this.g.fingers.end(7);
    this.taps++;
  }

  /** Une décision + `ms` de temps simulé. */
  tick(ms = 100) {
    const st = this.state();
    const screen = st.screen;
    if (screen !== this.lastScreen) {
      this.log({ type: 'screen', screen, at: this.t });
      this.lastScreen = screen;
    }
    const sc = st.scene;
    if (screen === 'title') this.tapEl('.screen-title');
    else if (screen === 'dawn') this.dawn();
    else if (screen === 'unlocks') this.tapEl('#unlock-ok');
    else if (screen === 'morning') this.morning(st);
    else if (sc && (sc.phase === 'day' || sc.phase === 'closing')) this.day(sc);
    else if (sc && sc.phase === 'night') this.night(sc);
    else this.release();
    this.g.hooks.advance(ms);
    this.t += ms;
  }

  dawn() {
    this.release();
    const chest = this.g.$('.dawn-chest');
    if (chest && !chest.hidden && !chest.classList.contains('open')) {
      this.tapEl(chest);
      return;
    }
    const up = this.g.$$('.card-up').find((b) => !b.hidden);
    if (up) {
      this.tapEl(up);
      this.log({ type: 'upgrade_tap', at: this.t });
      return;
    }
    const actions = this.g.$('.dawn-actions');
    const cont = this.g.$('#dawn-continue');
    if (actions && !actions.hidden && cont && !this.g.$$('.dawn-cards .card').length === false) this.tapEl(cont);
    else if (actions && !actions.hidden && cont) this.tapEl(cont);
  }

  morning() {
    this.release();
    if (this.onMorning && this.onMorning(this) === false) return;
    this.tapEl('#hub-open');
  }

  day(sc) {
    const p = sc.player;
    const d = sc.day;
    const w = sc.grid.w;
    const coins = sc.coins;
    // 1. Emplacement d'achat payable : on s'y place.
    if (d.pad && coins >= d.pad.price - d.pad.paid && sc.phase === 'day') {
      this.mode = 'pad';
      this.steer(p, d.pad.x + 0.5, d.pad.y + 0.5, 0.25);
      return;
    }
    const shelves = sc.furniture.filter((f) => f.kind === 'shelf');
    const producers = sc.furniture.filter((f) => f.kind === 'producer');
    // 2. Pile pleine ou produits en main : vers l'étagère qui en a le plus besoin.
    if (p.stack.length) {
      const fit = shelves
        .filter((s) => s.count < s.capacity && (!s.product || p.stack.includes(s.product)) && s.access >= 0)
        .sort((a, b) => a.count - b.count)[0];
      if (fit && (p.stack.length >= 4 || producers.every((f) => f.stock === 0) || this.mode === 'shelf')) {
        this.mode = 'shelf';
        const c = center(fit.access, w);
        this.steer(p, c.x, c.y, 0.3);
        return;
      }
    }
    // 3. Clients à la caisse ou tas de pièces : on encaisse.
    if (d.queue > 0 || d.pile > 0) {
      const lowShelf = shelves.some((s) => s.count === 0);
      if (!(lowShelf && p.stack.length === 0 && producers.some((f) => f.stock >= 3)) || d.queue > 1) {
        this.mode = 'register';
        const reg = sc.furniture.find((f) => f.id === 'caisse');
        this.steer(p, reg.x + 0.5, reg.y - 0.5, 0.35);
        return;
      }
    }
    // 4. Producteur garni : on remplit la pile.
    const prod = producers.filter((f) => f.stock > 0 && f.access >= 0).sort((a, b) => b.stock - a.stock)[0];
    if (prod) {
      this.mode = 'producer';
      const c = center(prod.access, w);
      this.steer(p, c.x, c.y, 0.3);
      return;
    }
    // 5. Sinon, près de la caisse.
    this.mode = 'idle';
    const reg = sc.furniture.find((f) => f.id === 'caisse');
    this.steer(p, reg.x + 0.5, reg.y - 0.6, 0.4);
  }

  night(sc) {
    if (this.passiveNight) {
      this.release();
      return;
    }
    const p = sc.player;
    const n = sc.night;
    if (n.bellCharge >= n.bellNeed && n.monsters.length >= 4) {
      this.tapCanvas(BELL.x, BELL.y);
      this.log({ type: 'bell', at: this.t });
    }
    const thief = n.monsters.find((m) => m.thief && !m.entering);
    if (thief) {
      this.steer(p, thief.x, thief.y, 0.15);
      return;
    }
    const reg = sc.furniture.find((f) => f.id === 'caisse');
    this.steer(p, reg.x - 0.5, reg.y - 0.5, 0.3);
  }
}
