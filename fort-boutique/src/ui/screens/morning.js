// Fort Boutique — le Matin (v1.1, V8) : la boutique vue de la rue, en plein jour (scène canvas, render/hub-scene.js).
// Chaque objet du monde ouvre un écran : la porte (OUVRIR), l'ardoise (Quêtes), le calendrier, la boîte aux lettres
// (Défi du jour), le poteau de rue (Carte), Moka sur l'auvent (Garde-robe), la lune (Pleine Lune) ; sur l'établi :
// le catalogue, la boîte à outils (Améliorer), le rouleau de plan bleu (Plans). Les zones de tap et les petites
// étiquettes kraft sont en DOM (accessibles, mêmes identifiants qu'avant) ; une notification = un cachet de cire.
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
import { countdown } from './quests.js';
import { drawHubScene, HUB_OBJECTS } from '../../render/hub-scene.js';
import { isAutomated } from '../../game/staff.js';

/** Raccourcis du hub, leur objet dans la scène et leur condition d'ouverture. */
export const HUB_BUTTONS = [
  { id: 'catalog', label: 'hub.catalog', feature: null, needsPads: true },
  // v1.1 (V4) : « Plans » remplace « Aménager » ; l'éditeur libre ne revient qu'avec l'option expert.
  { id: 'plans', label: 'hub.plans', feature: 'editor' },
  { id: 'editor', label: 'hub.editor', feature: 'editor', expert: true },
  { id: 'upgrades', label: 'hub.upgrades', feature: null },
  { id: 'quests', label: 'hub.quests', feature: 'quests' },
  { id: 'calendar', label: 'hub.calendar', feature: 'calendar' },
  { id: 'daily', label: 'hub.daily', feature: 'daily' },
];

/** Place d'un élément DOM sur la scène (pixels logiques). */
const place = (el, r) => {
  el.style.left = `${r.x}px`;
  el.style.top = `${r.y}px`;
  el.style.width = `${r.w}px`;
  el.style.height = `${r.h}px`;
  return el;
};

/** Cachet de cire rouge (notification, V8). Classe badge-dot gardée pour les outils et les tests. */
const waxSeal = () => h('span.badge-dot.wax-seal', { 'aria-hidden': 'true' });

/**
 * @param {any} app
 * @param {{ g: any, onOpen: () => void, onButton: (id: string) => void, onSettings: () => void, badges?: Record<string, boolean>,
 *   objective?: (d: any) => { el: HTMLElement, update: () => void }, hintOpen?: boolean, ready?: Set<string>, event?: any }} p
 */
/** Grain de papier et de bois (bruit à 6 à 10 %), généré une fois par code et partagé par les écrans (V8). */
function ensureGrain() {
  if (typeof document === 'undefined' || document.documentElement.style.getPropertyValue('--grain')) return;
  try {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const x = c.getContext('2d');
    if (!x || !x.getImageData) return;
    const img = x.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 14 + Math.floor(Math.random() * 12);
    }
    x.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
  } catch {
    /* sans grain */
  }
}

function mount(app, p, d) {
  ensureGrain();
  const g = p.g;
  const save = g.save;
  const pl = save.player;
  const ready = p.ready || new Set();
  const badges = p.badges || {};
  const name = t('game.name').split(' ');
  // Scène dessinée.
  const canvas = h('canvas.hub-canvas', { width: 720, height: 1280, 'aria-hidden': 'true' });
  const c2 = canvas.getContext ? canvas.getContext('2d') : null;
  const nightsLeft = Math.max(1, 8 - g.shop.night);
  const signals = {
    quests: !!badges.quests,
    questDots: questDots(save),
    calendar: !!badges.calendar,
    daily: !!badges.daily,
    mapBlink: (save.progress.pendingDistricts || []).length > 0,
    wardrobe: !!badges.wardrobe,
    wardrobeShown: true,
  };
  let time = 0;
  const draw = () => {
    if (!c2) return;
    c2.setTransform(2, 0, 0, 2, 0, 0);
    drawHubScene(c2, g, { t: time, signals, title: [name[0], name.slice(1).join(' ')], closed: t('hud.closedSign') });
  };

  const nope = (btn) => {
    if (app.services.audio) app.services.audio.play('error');
    btn.classList.remove('nope');
    void btn.offsetWidth;
    btn.classList.add('nope');
    if (btn.classList.contains('soon') && app.services.toast) app.services.toast(t('hub.soon'), SVG.lock);
  };
  // Un tap sur un objet : la scène zoome dessus pendant que l'écran s'ouvre (V8, 0,3 s).
  const zoomTo = (r) => {
    canvas.style.transformOrigin = `${r.x + r.w / 2}px ${r.y + r.h / 2}px`;
    canvas.classList.remove('hub-zoom');
    void canvas.offsetWidth;
    canvas.classList.add('hub-zoom');
  };

  // En haut : médaillon en bois (niveau et anneau d'XP), étiquette de prix (pièces, rubis), flamme, roue.
  const ring = Math.round(levelProgress(pl) * 100);
  const level = place(h('div.hub-medal', { 'aria-label': `${t('common.lvl')} ${pl.level}` }, [
    h('span.hub-medal-ring', { style: `--xp:${ring}%` }),
    h('span.hub-lvl', { text: String(pl.level) }),
    h('span.xp-bar', [h('span.xp-fill', { style: `width:${ring}%` })]),
  ]), HUB_OBJECTS.level);
  const money = place(h('div.hub-price-tag', [
    h('span.money', [h('span.money-ico', { html: SVG.coin }), h('span.money-n', { id: 'hub-coins', text: fmt(pl.coins) })]),
    isUnlocked(save, 'wardrobe') ? h('span.money', [h('span.money-ico', { html: SVG.ruby }), h('span.money-n', { text: fmt(pl.rubies) })]) : null,
  ]), HUB_OBJECTS.money);
  const gear = place(h('button.hub-gear.wood-btn', { type: 'button', 'aria-label': t('hub.settings'), html: SVG.gear }), HUB_OBJECTS.gear);
  onTap(gear, () => p.onSettings(), d);
  const layer = h('div.hub-world', [level, money, gear]);
  const s = save.daily.streak;
  if (isUnlocked(save, 'calendar') && (s.count > 0 || s.best > 0)) {
    const flame = place(h('button.hub-flame', { type: 'button', 'aria-label': t(s.count > 1 ? 'streak.days' : 'streak.day', { n: s.count }), id: 'hub-flame' }, [
      h('span.flame-ico', { html: flameSvg(flameColor(s.count)) }), h('span.flame-n', { text: String(s.count) }),
    ]), { x: 70, y: 14, w: 40, h: 40 });
    onTap(flame, () => (ready.has('calendar') ? p.onButton('calendar') : null), d);
    layer.appendChild(flame);
  }
  // Moka sur l'auvent : la Garde-robe.
  if (isUnlocked(save, 'wardrobe')) {
    const wb = place(h('button.hub-obj-plain', { type: 'button', 'aria-label': t('hub.wardrobe'), id: 'hub-wardrobe' }), HUB_OBJECTS.wardrobe);
    if (badges.wardrobe) wb.appendChild(waxSeal());
    onTap(wb, () => {
      if (!ready.has('wardrobe')) return;
      zoomTo(HUB_OBJECTS.wardrobe);
      if (app.services.audio) app.services.audio.play('cat');
      p.onButton('wardrobe');
    }, d);
    layer.appendChild(wb);
  }
  // La lune pâle : les nuits restantes avant la Pleine Lune.
  const moon = place(h('button.hub-moon', { type: 'button', 'aria-label': t('hub.fullMoon') }, [h('span.moon-n', { text: String(nightsLeft) })]), HUB_OBJECTS.moon);
  onTap(moon, () => (ready.has('moon') ? p.onButton('moon') : nope(moon)), d);
  // Le poteau de rue : la carte des quartiers.
  const mapBtn = place(h('button.hub-map.hub-obj-plain', { type: 'button', 'aria-label': t('hub.map') }, [h('span.hub-label', { text: t('hub.map') })]), HUB_OBJECTS.map);
  if (!ready.has('map')) mapBtn.classList.add('locked', 'soon');
  onTap(mapBtn, () => {
    if (!ready.has('map')) return nope(mapBtn);
    zoomTo(HUB_OBJECTS.map);
    return p.onButton('map');
  }, d);
  layer.append(moon, mapBtn);
  // Objectif (étiquette kraft) sous l'étiquette de prix.
  const objective = p.objective ? p.objective(d) : null;
  if (objective) layer.appendChild(h('div.hub-objective-slot', [objective.el]));

  // Les objets qui ouvrent un écran.
  const grid = h('div.hub-grid');
  for (const b of HUB_BUTTONS) {
    if (b.expert && !save.settings.freeLayout) continue;
    const unlockedByLevel = !b.feature || isUnlocked(save, b.feature);
    const padsLeft = b.needsPads ? padsRemaining(g) : 0;
    const open = unlockedByLevel && padsLeft === 0 && ready.has(b.id);
    const btn = tagButton({ label: t(b.label), variant: 'kraft', small: true, id: `hub-${b.id}` });
    btn.classList.add('hub-obj');
    btn.dataset.hub = b.id;
    const r = HUB_OBJECTS[b.id] || { x: 262, y: 490, w: 86, h: 40 };
    place(btn, r);
    if (!open) {
      btn.classList.add('locked');
      if (unlockedByLevel && padsLeft === 0) btn.classList.add('soon');
      const lvl = b.feature ? FEATURE_LEVELS[b.feature] : null;
      btn.querySelector('.tag-label').prepend(h('span.tag-icon.lock-ico', { html: SVG.lock }));
      if (lvl && !unlockedByLevel) {
        btn.appendChild(h('span.lvl-badge.req-badge', { 'aria-label': `${t('common.lvl')} ${lvl}` }, [h('span.req-ico', { html: SVG.lock }), h('span', { text: String(lvl) })]));
      } else if (padsLeft > 0) btn.appendChild(h('span.lvl-badge.pads-badge', { text: String(padsLeft) }));
    }
    if (badges[b.id]) btn.appendChild(waxSeal());
    onTap(btn, () => {
      if (btn.classList.contains('locked')) {
        nope(btn);
        return;
      }
      if (app.services.audio) app.services.audio.play('ui_tap');
      zoomTo(r);
      p.onButton(b.id);
    }, d);
    grid.appendChild(btn);
  }
  layer.appendChild(grid);

  // La porte : OUVRIR la journée, avec une grande étiquette verte accrochée à la poignée et la plaque du jour.
  const doorZone = place(h('button.hub-door.hub-obj-plain', { type: 'button', 'aria-hidden': 'true', tabindex: '-1' }), HUB_OBJECTS.open);
  const open = tagButton({ label: `${t('hub.open')} · ${t('hub.day')} ${g.shop.day}`, variant: 'green', id: 'hub-open' });
  open.classList.add('big', 'hub-open-tag');
  const go = () => {
    if (app.services.audio) app.services.audio.play('ui_tap');
    p.onOpen();
  };
  onTap(open, go, d);
  onTap(doorZone, go, d);
  layer.append(doorZone, open);
  // Boutique automatisée : petit badge « Auto » doré sur la façade.
  if (isAutomated(g.shop)) layer.appendChild(h('span.hub-auto', { html: `${SVG.gear}<span>${t('hud.auto')}</span>` }));
  // Événement de la semaine et saison : une bande de papier sur le trottoir.
  const ev = p.event;
  if (ev && ev.event.id !== 'none') {
    layer.appendChild(h('div.hub-event', { id: 'hub-event' }, [
      h('span.hub-event-name', { text: t(`event.${ev.event.id}`) }),
      h('span.hub-event-goal', { text: ev.done ? '✓' : `${ev.value}/${ev.goal}` }),
      h('span.hub-event-time', { text: countdown(ev.msLeft) }),
      ev.season ? h('span.hub-season', { text: t(`season.${ev.season.id}`) }) : null,
    ]));
  }
  const el = h('div.morning.hub-street', [canvas, layer]);
  let idle = 0;
  const touched = () => {
    idle = 0;
    open.classList.remove('hint-pulse');
  };
  d.add(listen(el, 'pointerdown', touched, true));
  d.add(listen(el, 'touchstart', touched, { capture: true, passive: true }));
  draw();
  return {
    el,
    update(dt) {
      time += dt;
      draw();
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

/** Avancée des quêtes du jour en points de craie (0 à 3). */
function questDots(save) {
  const list = (save.daily && save.daily.quests && save.daily.quests.list) || [];
  return list.filter((q) => q && q.goal > 0 && (q.progress || 0) >= q.goal).length;
}

export default { mount };
