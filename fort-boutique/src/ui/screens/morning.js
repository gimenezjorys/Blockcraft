// Fort Boutique — le Matin (hub, G20.8) : niveau, monnaies, lune, raccourcis, bouton OUVRIR.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG } from '../icons.js';
import { levelProgress, isUnlocked } from '../../game/progression.js';
import { FEATURE_LEVELS } from '../../data/unlocks.js';
import { padsRemaining } from '../../game/day/pads.js';
import { HINTS } from '../../data/tutorial.js';
import { listen } from '../../core/events.js';
import { flameSvg } from './calendar.js';
import { flameColor } from '../../game/streak.js';

/** Raccourcis du hub et leur condition d'ouverture. */
export const HUB_BUTTONS = [
  { id: 'catalog', label: 'hub.catalog', feature: null, needsPads: true },
  { id: 'editor', label: 'hub.editor', feature: 'editor' },
  { id: 'upgrades', label: 'hub.upgrades', feature: null },
  { id: 'quests', label: 'hub.quests', feature: 'quests' },
  { id: 'calendar', label: 'hub.calendar', feature: 'calendar' },
  { id: 'daily', label: 'hub.daily', feature: 'daily' },
];

/**
 * @param {any} app
 * @param {{ g: any, onOpen: () => void, onButton: (id: string) => void, onSettings: () => void, badges?: Record<string, boolean>,
 *   objective?: (d: any) => { el: HTMLElement, update: () => void }, hintOpen?: boolean, ready?: Set<string> }} p
 *   ready : écrans déjà disponibles (les autres affichent « Bientôt ») ; objective : étiquette « Prochain objectif » (G3.5) ;
 *   hintOpen : pendant les 10 premières minutes, OUVRIR pulse après 8 s sans aucun tap (G19)
 */
function mount(app, p, d) {
  const g = p.g;
  const save = g.save;
  const pl = save.player;
  const xpBar = h('span.xp-fill');
  xpBar.style.width = `${Math.round(levelProgress(pl) * 100)}%`;
  const top = h('div.hub-top', [
    h('div.hub-level', [h('span.hub-lvl', { text: `${t('common.lvl')} ${pl.level}` }), h('span.xp-bar', [xpBar])]),
    h('div.hub-money', [
      h('span.money', [h('span.money-ico', { html: SVG.coin }), h('span.money-n', { id: 'hub-coins', text: fmt(pl.coins) })]),
      isUnlocked(save, 'wardrobe') ? h('span.money', [h('span.money-ico', { html: SVG.ruby }), h('span.money-n', { text: fmt(pl.rubies) })]) : null,
    ]),
  ]);
  // Flamme de la boutique (G15.2) : jours de série ; un tap ouvre le Calendrier.
  const s = save.daily.streak;
  if (isUnlocked(save, 'calendar') && (s.count > 0 || s.best > 0)) {
    const flame = h('button.hub-flame', { type: 'button', 'aria-label': t('streak.days', { n: s.count }), id: 'hub-flame' }, [
      h('span.flame-ico', { html: flameSvg(flameColor(s.count)) }), h('span.flame-n', { text: String(s.count) }),
    ]);
    onTap(flame, () => (ready.has('calendar') ? p.onButton('calendar') : null), d);
    top.appendChild(flame);
  }
  const gear = h('button.hub-gear', { type: 'button', 'aria-label': t('hub.settings'), html: SVG.gear });
  onTap(gear, () => p.onSettings(), d);
  top.appendChild(gear);
  // Nuits jusqu'à la Pleine Lune comprise (G19 3:02 : « 6 » au premier Matin).
  const nightsLeft = Math.max(1, 8 - g.shop.night);
  const ready = p.ready || new Set();
  const nope = (btn) => {
    if (app.services.audio) app.services.audio.play('error');
    btn.classList.remove('nope');
    void btn.offsetWidth;
    btn.classList.add('nope');
    if (btn.classList.contains('soon') && app.services.toast) app.services.toast(t('hub.soon'), SVG.lock);
  };
  const moon = h('button.hub-moon', { type: 'button', 'aria-label': t('hub.fullMoon') }, [h('span.moon-ico', { html: SVG.moon }), h('span.moon-n', { text: String(nightsLeft) })]);
  onTap(moon, () => (ready.has('moon') ? p.onButton('moon') : nope(moon)), d);
  const mapBtn = h('button.hub-map', { type: 'button', 'aria-label': t('hub.map'), html: SVG.map });
  if (!ready.has('map')) mapBtn.classList.add('locked', 'soon');
  onTap(mapBtn, () => (ready.has('map') ? p.onButton('map') : nope(mapBtn)), d);
  const objective = p.objective ? p.objective(d) : null;
  const row2 = h('div.hub-row2', [mapBtn, objective ? h('div.hub-objective-slot', [objective.el]) : h('div.hub-objective-slot'), moon]);
  const grid = h('div.hub-grid');
  for (const b of HUB_BUTTONS) {
    const unlockedByLevel = !b.feature || isUnlocked(save, b.feature);
    const padsLeft = b.needsPads ? padsRemaining(g) : 0;
    const open = unlockedByLevel && padsLeft === 0 && ready.has(b.id);
    const btn = tagButton({ label: t(b.label), variant: 'kraft', small: true, id: `hub-${b.id}` });
    btn.dataset.hub = b.id;
    if (!open) {
      btn.classList.add('locked');
      if (unlockedByLevel && padsLeft === 0) btn.classList.add('soon');
      const lvl = b.feature ? FEATURE_LEVELS[b.feature] : null;
      btn.insertBefore(h('span.tag-icon.lock-ico', { html: SVG.lock }), btn.querySelector('.tag-label'));
      // Niveau requis : « cadenas + chiffre », pour ne pas le confondre avec le niveau d'un meuble (Sam, P1).
      if (lvl && !unlockedByLevel) {
        const badge = h('span.lvl-badge.req-badge', { 'aria-label': `${t('common.lvl')} ${lvl}` }, [h('span.req-ico', { html: SVG.lock }), h('span', { text: String(lvl) })]);
        btn.appendChild(badge);
      }
      // Catalogue : nombre d'emplacements d'achat encore à payer (un chiffre et un petit carré pointillé).
      else if (padsLeft > 0) btn.appendChild(h('span.lvl-badge.pads-badge', { text: String(padsLeft) }));
    }
    if (p.badges && p.badges[b.id]) btn.appendChild(h('span.badge-dot'));
    onTap(btn, () => {
      if (btn.classList.contains('locked')) {
        nope(btn);
        return;
      }
      if (app.services.audio) app.services.audio.play('ui_tap');
      p.onButton(b.id);
    }, d);
    grid.appendChild(btn);
  }
  const open = tagButton({ label: `${t('hub.open')} · ${t('hub.day')} ${g.shop.day}`, variant: 'green', id: 'hub-open' });
  open.classList.add('big');
  onTap(open, () => {
    if (app.services.audio) app.services.audio.play('ui_tap');
    p.onOpen();
  }, d);
  const el = h('div.morning', [top, row2, h('div.hub-spacer'), grid, h('div.hub-open-wrap', [open])]);
  let idle = 0;
  const touched = () => {
    idle = 0;
    open.classList.remove('hint-pulse');
  };
  d.add(listen(el, 'pointerdown', touched, true));
  d.add(listen(el, 'touchstart', touched, { capture: true, passive: true }));
  return {
    el,
    update(dt) {
      if (objective) objective.update();
      if (!p.hintOpen) return;
      idle += dt;
      if (idle >= HINTS.morningPulseS && !open.classList.contains('hint-pulse')) open.classList.add('hint-pulse');
    },
    onKey(key) {
      if (key === 'Enter') {
        p.onOpen();
        return true;
      }
      return false;
    },
    refresh() {
      const c = el.querySelector('#hub-coins');
      if (c) c.textContent = fmt(save.player.coins);
    },
  };
}

export default { mount };
