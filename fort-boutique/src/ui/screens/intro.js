// Fort Boutique — la scène de l'enveloppe (G19 0:02) : intérieur poussiéreux au matin, le portrait de Mamie fait un clin
// d'œil, une enveloppe tombe sur la caisse et brille. Un tap : une clé en sort, tourne dans la porte, les rideaux s'ouvrent
// et la lumière entre. Aucun texte. Après 4 s sans tap, une main fantôme montre l'enveloppe (G19, principes).
import { h, onTap } from '../widgets.js';
import { t } from '../i18n.js';
import { SVG } from '../icons.js';
import { HINTS } from '../../data/tutorial.js';

/** L'enveloppe commence à tomber (s) ; la clé, les rideaux et la lumière durent OPEN_S (jour 1 vers 0:06). */
const FALL_AT = 1.2;
const OPEN_S = 2.4;
const ENVELOPE = `<svg viewBox="0 0 64 46" aria-hidden="true"><rect x="3" y="5" width="58" height="38" rx="5" fill="#FFF6E5" stroke="#2B1A33" stroke-width="3.5"/>
<path d="M4 8l28 20L60 8" fill="none" stroke="#2B1A33" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="32" cy="27" r="6.5" fill="#FF4F5E" stroke="#2B1A33" stroke-width="2.6"/></svg>`;
const KEY = `<svg viewBox="0 0 60 24" aria-hidden="true"><circle cx="11" cy="12" r="8" fill="#FFD23F" stroke="#2B1A33" stroke-width="3"/>
<circle cx="11" cy="12" r="3" fill="#FFF6E5" stroke="#2B1A33" stroke-width="2"/><path d="M19 10h36v5h-5v5h-5v-5h-5v4h-5v-4h-11z" fill="#FFD23F" stroke="#2B1A33" stroke-width="2.6" stroke-linejoin="round"/></svg>`;
const PORTRAIT = `<svg viewBox="0 0 60 70" aria-hidden="true"><rect x="3" y="3" width="54" height="64" rx="8" fill="#B86B3C" stroke="#2B1A33" stroke-width="3.5"/>
<rect x="10" y="10" width="40" height="50" rx="5" fill="#FFE8C6" stroke="#2B1A33" stroke-width="2.5"/>
<path d="M17 30c0-12 26-12 26 0" fill="#E8E2F0" stroke="#2B1A33" stroke-width="2.4"/><circle cx="30" cy="38" r="11" fill="#FFC9A8" stroke="#2B1A33" stroke-width="2.4"/>
<circle class="eye-l" cx="25.5" cy="36.5" r="1.8" fill="#2B1A33"/><path class="eye-r" d="M32.5 36.5h4" stroke="#2B1A33" stroke-width="2.2" stroke-linecap="round"/>
<circle class="eye-r-open" cx="34.5" cy="36.5" r="1.8" fill="#2B1A33"/><path d="M26 42.5q4 3.5 8 0" fill="none" stroke="#2B1A33" stroke-width="2" stroke-linecap="round"/>
<circle cx="22" cy="41" r="2.2" fill="#FF8FB1" opacity=".7"/><circle cx="38" cy="41" r="2.2" fill="#FF8FB1" opacity=".7"/></svg>`;

export default {
  /**
   * @param {any} app
   * @param {{ register: { x: number, y: number }, door: { x: number, y: number }, onDone: () => void }} p
   *   positions à l'écran (pixels logiques) de la caisse et de la porte
   */
  mount(app, p, d) {
    const sfx = (id, o) => app.services.audio && app.services.audio.play(id, o);
    const dim = h('div.intro-dim');
    const dust = h('div.intro-dust', { 'aria-hidden': 'true' }, Array.from({ length: 14 }, (_, i) => h('i', { style: `--i:${i}` })));
    const portrait = h('div.intro-portrait', { html: PORTRAIT });
    const env = h('button.intro-envelope', { type: 'button', 'aria-label': t('intro.envelope'), html: ENVELOPE });
    env.style.left = `${p.register.x - 30}px`;
    env.style.top = `${p.register.y - 44}px`;
    const key = h('div.intro-key', { html: KEY });
    key.style.left = `${p.register.x - 28}px`;
    key.style.top = `${p.register.y - 40}px`;
    key.style.setProperty('--dx', `${p.door.x - p.register.x}px`);
    key.style.setProperty('--dy', `${p.door.y - p.register.y}px`);
    key.hidden = true;
    const curtains = h('div.intro-curtains', [h('span.curtain.left'), h('span.curtain.right')]);
    const hand = h('div.ghost-hand.tap', { html: SVG.hand, 'aria-hidden': 'true' });
    hand.style.left = `${p.register.x - 6}px`;
    hand.style.top = `${p.register.y - 18}px`;
    hand.hidden = true;
    const el = h('div.intro', [dim, dust, portrait, curtains, env, key, hand]);
    const st = { t: 0, falling: false, landed: false, opened: false, openT: 0, done: false, idle: 0 };

    function open() {
      if (st.opened) return;
      st.opened = true;
      hand.hidden = true;
      env.classList.add('open');
      key.hidden = false;
      key.classList.add('fly');
      sfx('door_bell');
      if (app.services.vibrate) app.services.vibrate(20);
    }
    // Toute la scène répond : on ne bloque jamais un joueur qui tape à côté de l'enveloppe.
    onTap(el, open, d);
    onTap(env, open, d);
    return {
      el,
      update(dt) {
        st.t += dt;
        // G19 : fondu (≈ 1 s), clin d'œil, l'enveloppe tombe (0,7 s) et brille sur la caisse vers 0:02.
        if (!st.falling && st.t >= FALL_AT) {
          st.falling = true;
          env.classList.add('falling');
        }
        if (!st.landed && st.t >= FALL_AT + 0.7) {
          st.landed = true;
          env.classList.add('landed');
          sfx('drop');
        }
        if (st.t >= 0.6) portrait.classList.add('wink');
        if (st.landed && !st.opened) {
          st.idle += dt;
          if (st.idle >= HINTS.delayS) hand.hidden = false;
        }
        if (st.opened && !st.done) {
          st.openT += dt;
          if (st.openT >= 0.9) curtains.classList.add('open');
          if (st.openT >= 1.2) dim.classList.add('light');
          if (st.openT >= OPEN_S) {
            st.done = true;
            p.onDone();
          }
        }
      },
      onKey(k) {
        if (k === 'Enter' || k === ' ') {
          open();
          return true;
        }
        return false;
      },
    };
  },
};
