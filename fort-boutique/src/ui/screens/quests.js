// Fort Boutique — Quêtes (G14, G20.8) : ardoise à onglets Jour / Semaine / Succès / Bestiaire. Lignes à la craie avec
// barre de progression ; Réclamer, relance gratuite ; compte à rebours jusqu'aux nouvelles quêtes (minuit UTC).
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG, monsterIcon, chestSvg, productIcon } from '../icons.js';
import { QUESTS } from '../../data/quests.js';
import { ACHIEVEMENTS, BESTIARY } from '../../data/achievements.js';
import { FEATURE_LEVELS } from '../../data/unlocks.js';
import { isUnlocked } from '../../game/progression.js';
import { rerollsLeft } from '../../game/quests.js';
import { achievementMetric } from '../../game/achievements.js';
import { bestiaryTier } from '../../game/bestiary.js';
import { rewardChips } from './reward.js';
import { now, msUntilNextUtcDay, msUntilNextUtcWeek, durationParts } from '../../core/time.js';

const TABS = [['day', 'quests'], ['week', 'weeklyQuests'], ['achievements', 'achievements'], ['bestiary', 'bestiary']];
/** Types du bestiaire dans l'ordre des quartiers (G10.1). */
const BESTIARY_ORDER = ['raton', 'souris', 'gloubi', 'termite', 'chauvesouris', 'herisson', 'champiboum', 'fantome', 'lutin', 'gourmand', 'corbeau', 'golem', 'phalene'];

/** « 5 h 12 min » (ou « 2 j 3 h »). */
export function countdown(ms) {
  const p = durationParts(ms);
  if (p.d > 0) return t('time.dh', { d: p.d, h: p.h });
  return t('time.hm', { h: p.h, m: p.m });
}

/** Libellé d'une quête (« Servir 40 clients »). */
export function questLabel(q) {
  return t(`quest.${q.id}`, { n: fmt(q.goal), prod: q.product ? t(`prod.${q.product}`) : '' });
}

function achievementLabel(a) {
  const [kind, arg] = a.metric.split(':');
  return t(`ach.${kind}`, { n: fmt(a.goal), name: arg ? t(`mon.${arg}`) : '' });
}

/**
 * @param {any} app
 * @param {{ save: any, tab?: string, onClaim: (i: number) => any, onClaimWeekly: (i: number) => any,
 *   onReroll: (i: number) => boolean, onClose: () => void }} p
 */
function mount(app, p, d) {
  const save = p.save;
  let tab = TABS.some(([k]) => k === p.tab) ? p.tab : 'day';
  const sfx = (id) => app.services.audio && app.services.audio.play(id);
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back, id: 'quests-close' });
  onTap(back, () => p.onClose(), d);
  const rubies = h('span.money-n', { text: fmt(save.player.rubies) });
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('hub.quests') }), h('span.money', [h('span.money-ico', { html: SVG.ruby }), rubies])]);
  const tabs = h('div.panel-filters');
  const list = h('div.up-list.quest-list');
  const timer = h('div.up-note.quest-timer');

  for (const [k, feature] of TABS) {
    const open = isUnlocked(save, feature);
    const b = tagButton({ label: t(`quests.tab.${k}`), small: true, variant: k === tab ? 'green' : 'kraft', id: `quests-tab-${k}` });
    b.dataset.tab = k;
    if (!open) {
      b.classList.add('locked');
      b.appendChild(h('span.lvl-badge.req-badge', [h('span.req-ico', { html: SVG.lock }), h('span', { text: String(FEATURE_LEVELS[feature]) })]));
    }
    onTap(b, () => {
      if (!open) {
        sfx('error');
        if (app.services.toast) app.services.toast(t('upgrades.lockedAt', { n: FEATURE_LEVELS[feature] }), SVG.lock);
        return;
      }
      tab = k;
      for (const x of tabs.children) x.dataset.variant = x.dataset.tab === tab ? 'green' : 'kraft';
      render();
    }, d);
    tabs.appendChild(b);
  }
  if (!TABS.some(([k, f]) => k === tab && isUnlocked(save, f))) tab = 'day';

  /** Ligne de quête : texte, barre, puis Réclamer / coche / relance. */
  function questRow(q, i, weekly) {
    const pct = Math.min(1, q.progress / Math.max(1, q.goal));
    const fill = h('span.q-fill');
    fill.style.width = `${Math.round(pct * 100)}%`;
    const text = h('div.up-text', [
      h('div.up-title', { text: questLabel(q) }),
      h('div.q-bar', [fill, h('span.q-n', { text: `${fmt(Math.floor(q.progress))}/${fmt(q.goal)}` })]),
    ]);
    const icon = q.product ? productIcon(q.product, 30) : h('span.up-emoji', { html: weekly ? chestSvg('gold') : SVG.scroll });
    const r = h('div.up-row.q-row', { 'data-id': q.id, 'data-i': String(i) }, [h('div.up-ico', [icon]), text]);
    if (q.claimed) {
      r.classList.add('q-done');
      r.appendChild(h('span.up-emoji.q-check', { html: SVG.check }));
    } else if (q.progress >= q.goal) {
      const b = tagButton({ label: t('quests.claim'), small: true, variant: 'green', id: `${weekly ? 'week' : 'quest'}-claim-${i}` });
      b.classList.add('hint-pulse');
      onTap(b, () => {
        const res = weekly ? p.onClaimWeekly(i) : p.onClaim(i);
        if (!res) return sfx('error');
        rubies.textContent = fmt(save.player.rubies);
        render();
      }, d);
      r.appendChild(b);
    } else if (!weekly && rerollsLeft(save).free > 0) {
      const b = h('button.q-reroll', { type: 'button', 'aria-label': t('quests.reroll'), html: SVG.rotate, id: `quest-reroll-${i}` });
      onTap(b, () => {
        if (!p.onReroll(i)) return sfx('error');
        sfx('ui_tap');
        render();
      }, d);
      r.appendChild(b);
    }
    return r;
  }

  function render() {
    list.innerHTML = '';
    if (tab === 'day') {
      const qs = save.daily.quests;
      const order = qs.list.filter((q) => q.claimed).length;
      // Prochaine récompense (selon l'ordre des réclamations, G14.1).
      if (order < QUESTS.rewards.length) {
        list.appendChild(h('div.q-next', [h('span', { text: t('quests.next') }), ...rewardChips(QUESTS.rewards[order])]));
      }
      qs.list.forEach((q, i) => list.appendChild(questRow(q, i, false)));
      if (!qs.allClaimed) list.appendChild(h('div.q-next', [h('span', { text: t('quests.all3') }), ...rewardChips(QUESTS.allBonus)]));
    } else if (tab === 'week') {
      const wk = save.daily.weekly;
      wk.list.forEach((q, i) => list.appendChild(questRow(q, i, true)));
      if (!wk.allClaimed) list.appendChild(h('div.q-next', [h('span', { text: t('quests.all5') }), ...rewardChips({ chest: 'moon', cosmetic: 'week' })]));
    } else if (tab === 'achievements') {
      const got = save.collections.achievements;
      const sorted = ACHIEVEMENTS.slice().sort((a, b) => (got[a.id] !== undefined) - (got[b.id] !== undefined));
      for (const a of sorted) {
        const v = Math.min(a.goal, achievementMetric(save, a.metric));
        const fill = h('span.q-fill');
        fill.style.width = `${Math.round((v / a.goal) * 100)}%`;
        const r = h('div.up-row.q-row', { 'data-id': a.id }, [
          h('div.up-ico', [h('span.up-emoji', { html: got[a.id] !== undefined ? SVG.check : SVG.star })]),
          h('div.up-text', [h('div.up-title', { text: achievementLabel(a) }), h('div.q-bar', [fill, h('span.q-n', { text: `${fmt(v)}/${fmt(a.goal)}` })])]),
          h('span.rw-chip', [h('span.rw-ico', { html: SVG.ruby }), h('span.rw-n', { text: String(a.rubies) })]),
        ]);
        if (got[a.id] !== undefined) r.classList.add('q-done');
        list.appendChild(r);
      }
    } else {
      const seen = save.collections.seenMonsters;
      const grid = h('div.best-grid');
      for (const type of BESTIARY_ORDER) {
        const n = save.collections.bestiary[type] || 0;
        const known = seen.includes(type) || n > 0;
        const tier = bestiaryTier(n);
        const next = BESTIARY.tiers[tier];
        const card = h('div.best-card', { 'data-type': type, 'data-known': known ? '1' : '0' }, [
          monsterIcon(type, 56),
          h('div.best-name', { text: known ? t(`mon.${type}`) : '???' }),
          h('div.best-n', { text: next ? `${fmt(n)}/${fmt(next)}` : fmt(n) }),
          h('div.best-tier', { text: '★'.repeat(tier) + '☆'.repeat(3 - tier) }),
        ]);
        grid.appendChild(card);
      }
      list.appendChild(h('div.up-note', { text: t('best.note') }));
      list.appendChild(grid);
    }
  }
  render();
  const el = h('div.panel.slate-full.quests', [head, tabs, timer, list]);
  return {
    el,
    update() {
      const ms = tab === 'week' ? msUntilNextUtcWeek(now()) : msUntilNextUtcDay(now());
      const txt = tab === 'achievements' || tab === 'bestiary' ? '' : t('quests.newIn', { time: countdown(ms) });
      if (timer.textContent !== txt) timer.textContent = txt;
    },
    onKey(key) {
      if (key === 'Escape') {
        p.onClose();
        return true;
      }
      return false;
    },
  };
}

export default { mount };
