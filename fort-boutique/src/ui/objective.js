// Fort Boutique — étiquette kraft « Prochain objectif » (G3.5), au Matin et pendant le Jour.
// Pendant les 10 premières minutes, aucun mot (G19) : une icône, un nombre, une barre. Le nom est dans aria-label.
import { h, onTap } from './widgets.js';
import { t, fmt } from './i18n.js';
import { SVG, furnitureIcon, featureIconSvg, productIcon } from './icons.js';
import { nextObjective, objectiveKey } from '../game/objectives.js';
import { currentMamie, checkMamie, mamieTarget } from '../game/mamie.js';
import { catVisit } from '../game/cat.js';
import { MAMIE_FX } from '../data/mamie.js';
import { perfNow as now } from '../core/time.js';


/**
 * @param {() => any} game
 * @param {(o: ReturnType<typeof nextObjective>) => void} onPick tap : « emmène à l'endroit concerné »
 * @param {import('../core/events.js').Disposer} d
 */
export function createObjective(game, onPick, d) {
  const el = h('button.objective.interactive', { type: 'button', 'aria-label': t('hud.objective'), id: 'objective' });
  let key = '';
  let current = null;
  // Les icônes de meubles sont des petits canvas : on les garde pour ne pas les redessiner à chaque pièce payée.
  const icons = new Map();
  const icon = (id, sil) => {
    const k = `${id}:${sil ? 1 : 0}`;
    if (!icons.has(k)) {
      const c = furnitureIcon(id, 26);
      if (sil) c.classList.add('silhouette');
      icons.set(k, c);
    }
    return icons.get(k);
  };

  /** Carte d'un Objectif de Mamie (V2.3) : icône, 6 mots au plus, nombre et barre. */
  function renderMamie(m) {
    el.innerHTML = '';
    el.dataset.kind = 'mamie';
    el.classList.add('mamie');
    el.setAttribute('aria-label', t(`mamie.${m.def.id}`));
    el.appendChild(h('span.tag-hole'));
    const ico = h('span.obj-ico');
    const [kind, id] = String(m.def.icon || 'svg:star').split(':');
    if (kind === 'furn') ico.appendChild(icon(id, false));
    else if (kind === 'prod') ico.appendChild(productIcon(id, 26));
    else ico.innerHTML = SVG[id] || SVG.star;
    const fill = h('span.obj-fill');
    fill.style.width = `${Math.round(m.progress * 50) * 2}%`;
    const num = m.goal > 1 ? h('span.obj-count', { text: `${fmt(m.value)}/${fmt(m.goal)}` }) : null;
    el.append(ico, h('span.obj-body', [h('span.obj-text', { text: t(`mamie.${m.def.id}`) }), h('span.obj-row', [h('span.obj-bar', [fill]), num].filter(Boolean))]));
  }

  // Tampon « Fait ! » puis glissement (V2.3) : l'objectif réussi reste affiché le temps du tampon.
  let stampUntil = 0;
  let mamieKey = '';
  function updateMamie(g) {
    const tNow = now();
    if (stampUntil) {
      if (tNow < stampUntil) return true;
      stampUntil = 0;
      el.classList.remove('stamped');
      el.classList.remove('slide-in');
      void el.offsetWidth;
      el.classList.add('slide-in');
      mamieKey = '';
    }
    const done = checkMamie(g);
    if (done) {
      const st = h('span.obj-stamp', { text: t('mamie.done') });
      const fill = el.querySelector('.obj-fill');
      if (fill) fill.style.width = '100%';
      el.appendChild(st);
      el.classList.add('stamped');
      stampUntil = tNow + MAMIE_FX.stampMs;
      if (done.reward.coins <= 0 || g.phase.name === 'morning') flyDom(done.reward);
      return true;
    }
    const m = currentMamie(g);
    if (!m) {
      el.classList.remove('mamie');
      return false;
    }
    const k = `${m.def.id}:${Math.round(m.progress * 50)}:${m.value}`;
    if (k === mamieKey) return true;
    const isNew = !mamieKey || mamieKey.split(':')[0] !== m.def.id;
    mamieKey = k;
    current = { kind: 'mamie', def: m.def };
    key = '';
    renderMamie(m);
    // Nouvel objectif pendant le Jour : Moka va voir (un clin d'œil, la flèche reste le vrai repère).
    if (isNew && g.cat && (g.phase.name === 'day' || g.phase.name === 'closing')) {
      const tg = mamieTarget(g, m.def);
      if (tg) catVisit(g, tg.x, tg.y);
    }
    return true;
  }

  /** Au Matin (ou pour des plans, un coffre) : un petit « +N » qui monte de la carte. */
  function flyDom(r) {
    const parts = [];
    if (r.coins > 0) parts.push(`+${fmt(r.coins)}`);
    for (const [, n] of r.plans) parts.push(`+${n}`);
    const f = h('span.obj-fly', parts.length ? { text: parts.join(' ') } : { html: SVG.star });
    if (r.plans.length) f.prepend(h('span.obj-fly-ico', { html: SVG.plan }));
    if (r.coins > 0) f.prepend(h('span.obj-fly-ico', { html: SVG.coin }));
    el.appendChild(f);
  }

  function render(o) {
    el.classList.remove('mamie');
    el.setAttribute('aria-label', t('hud.objective'));
    el.innerHTML = '';
    el.dataset.kind = o.kind;
    el.appendChild(h('span.tag-hole'));
    const ico = h('span.obj-ico');
    let num = null;
    if (o.kind === 'pad') {
      ico.appendChild(icon(o.furniture, false));
      num = h('span.obj-num', [h('span.money-ico', { html: SVG.coin }), h('span', { text: fmt(o.remaining) })]);
    } else if (o.kind === 'upgrade') {
      ico.appendChild(icon(o.furniture, false));
      num = h('span.obj-num.up', { html: SVG.arrowUp });
    } else if (o.kind === 'quest') {
      ico.innerHTML = SVG.scroll;
    } else if (o.kind === 'unlock') {
      if (o.furniture) ico.appendChild(icon(o.furniture, true));
      else ico.innerHTML = featureIconSvg(o.feature);
      num = h('span.obj-num.lvl', [h('span.req-ico', { html: SVG.lock }), h('span', { text: String(o.level) })]);
    } else {
      ico.innerHTML = SVG.moon;
      num = h('span.obj-num', { text: String(o.nights) });
    }
    const fill = h('span.obj-fill');
    // Même arrondi que la clé de rendu (pas de barre figée à 99 %, P2 Sam).
    fill.style.width = `${Math.round(o.progress * 50) * 2}%`;
    el.append(ico, h('span.obj-body', [num, h('span.obj-bar', [fill])].filter(Boolean)));
  }

  function update() {
    const g = game();
    if (!g) return;
    if (updateMamie(g)) return;
    mamieKey = '';
    const o = nextObjective(g);
    current = o;
    const k = objectiveKey(o);
    if (k === key) return;
    const changed = key && key.split(':')[0] + key.split(':')[1] !== k.split(':')[0] + k.split(':')[1];
    key = k;
    render(o);
    if (changed) {
      // Nouvel objectif : petit saut de l'étiquette.
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
  }

  onTap(el, () => current && onPick(current), d);
  update();
  return { el, update, current: () => current };
}
