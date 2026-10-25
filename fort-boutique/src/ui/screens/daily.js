// Fort Boutique — Défi du jour (G13.3) : la carte du jour (quartier, meubles et Grignotins imposés, « NOUVEAU »),
// Jouer ou Entraînement, résultat (score, étoiles, vagues, gains, rang), Partager, Rivaux simulés du jour.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG, furnitureIcon, monsterIcon } from '../icons.js';
import { ownedFurnitureIds } from '../../game/chests.js';
import { dailyRivals, dailyFirstAttempt, shareText } from '../../game/daily.js';
import { rewardChips } from './reward.js';
import { countdown } from './quests.js';
import { now, msUntilNextUtcDay } from '../../core/time.js';

const MARK = { clean: '🟩', caught: '🟨', lost: '🟥' };

/**
 * @param {any} app
 * @param {{ save: any, day: number, setup: any, result?: any, onPlay: () => void, onShare: (text: string) => void,
 *   onClose: () => void }} p
 */
function mount(app, p, d) {
  const save = p.save;
  const c = save.daily.challenge;
  const played = !dailyFirstAttempt(save, p.day);
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back, id: 'daily-close' });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('hub.daily') })]);
  const owned = new Set(ownedFurnitureIds(save));
  const seen = new Set(save.collections.seenMonsters);
  const isNew = (cond) => (cond ? h('span.new-tag', { text: t('daily.new') }) : null);
  const card = h('div.daily-card', [
    h('div.up-title', { text: t('daily.shop', { name: t(`district.${p.setup.district}`) }) }),
    h('div.daily-icons', p.setup.furniture.map((id) => h('div.daily-ico', { 'data-id': id }, [furnitureIcon(id, 36), isNew(!owned.has(id))]))),
    h('div.daily-icons', p.setup.monsters.map((m) => h('div.daily-ico', { 'data-id': m }, [monsterIcon(m, 36), isNew(!seen.has(m))]))),
  ]);
  const parts = [head, card];
  // Résultat de la tentative qui vient de finir.
  const r = p.result;
  const shareData = r ? { day: p.day, stars: r.stars, score: r.score, waves: r.waves } : played ? { day: p.day, stars: c.starsToday || 1, score: c.scoreToday, waves: c.wavesToday || [] } : null;
  if (r) {
    parts.push(h('div.daily-result', [
      h('div.daily-score', { text: `${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)} ${fmt(r.score)} ${t('daily.pts')}` }),
      h('div.daily-marks', { text: r.waves.map((w) => MARK[w]).join('') }),
      r.first ? h('div.rw-chips', rewardChips(r.reward)) : h('div.up-note', { text: t('daily.practiceDone') }),
      h('div.up-note', { text: t('daily.rank', { n: r.rank, total: 21 }) }),
    ]));
  } else if (played) {
    parts.push(h('div.daily-result', [h('div.daily-score', { text: `${t('daily.today')} : ${fmt(c.scoreToday)} ${t('daily.pts')}` })]));
  }
  const actions = h('div.set-actions');
  const play = tagButton({ label: t(played ? 'daily.practice' : 'daily.play'), variant: played ? 'kraft' : 'green', id: 'daily-play' });
  onTap(play, () => p.onPlay(), d);
  actions.appendChild(play);
  if (shareData) {
    const share = tagButton({ label: t('daily.share'), small: true, id: 'daily-share' });
    // L'adresse partagée est celle de la page (le jeu n'en contient aucune en dur).
    const url = typeof location !== 'undefined' && /^https?:/.test(location.protocol) ? `${location.origin}${location.pathname}` : '';
    onTap(share, () => p.onShare(shareText(shareData, save.settings.lang, url)), d);
    actions.appendChild(share);
  }
  parts.push(actions);
  // Rivaux du jour (simulés, G13.3) avec la place du joueur.
  const mine = played ? c.scoreToday : null;
  const rows = dailyRivals(p.day).map((x) => ({ name: t('daily.rival', { n: x.id + 1 }), score: x.score, me: false }));
  if (mine !== null) rows.push({ name: t('daily.you'), score: mine, me: true });
  rows.sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
  parts.push(h('h3.set-h', { text: t('daily.rivals') }));
  parts.push(h('div.daily-rivals', rows.map((x, i) => h(`div.daily-rival${x.me ? '.me' : ''}`, [h('span', { text: `${i + 1}.` }), h('span', { text: x.name }), h('span', { text: fmt(x.score) })]))));
  const timer = h('div.up-note');
  parts.splice(2, 0, timer);
  const el = h('div.panel.slate-full.daily', [h('div.up-list', parts)]);
  return {
    el,
    update() {
      const txt = t('daily.next', { time: countdown(msUntilNextUtcDay(now())) });
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
