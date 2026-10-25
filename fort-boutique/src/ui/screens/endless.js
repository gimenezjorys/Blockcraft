// Fort Boutique — Nuit sans fin (G13.2) : record, coffres du jour, Jouer, résultat de la partie, Rivaux simulés de la
// semaine (toujours étiquetés « simulés », jamais présentés comme de vrais joueurs).
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG } from '../icons.js';
import { ENDLESS } from '../../data/balance.js';
import { DISTRICT_IDS } from '../../data/districts.js';
import { rewardChips } from './reward.js';

/**
 * @param {any} app
 * @param {{ save: any, shopId: string, rivals: Array<{ name: string, score: number }>, result?: any,
 *   onPlay: (shopId: string) => void, onClose: () => void }} p
 */
function mount(app, p, d) {
  const e = p.save.endless;
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back, id: 'endless-close' });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('endless.title') })]);
  // Choisir la boutique (G13.2) : sa disposition et ses meubles sont pris tels quels.
  let shopId = p.shopId;
  const shops = DISTRICT_IDS.filter((id) => p.save.shops[id] && p.save.shops[id].unlocked);
  const title = h('div.up-title');
  const setTitle = () => {
    title.textContent = t('endless.shop', { name: t(`district.${shopId}`) });
  };
  setTitle();
  const picks = shops.length > 1 ? h('div.endless-shops', shops.map((id) => {
    const b = tagButton({ label: t(`district.${id}`), variant: id === shopId ? 'green' : 'kraft', small: true, id: `endless-shop-${id}` });
    onTap(b, () => {
      shopId = id;
      for (const x of picks.querySelectorAll('.tag')) x.setAttribute('data-variant', x === b ? 'green' : 'kraft');
      setTitle();
    }, d);
    return b;
  })) : null;
  const parts = [
    head,
    h('div.daily-card', [
      title,
      picks,
      h('div.up-note', { text: t('endless.intro') }),
      h('div.up-note', { text: t('endless.best', { n: e.best }) }),
      h('div.up-note', { text: t('endless.chests', { n: e.chestsToday, max: ENDLESS.chestsPerDay }) }),
    ]),
  ];
  const r = p.result;
  if (r) {
    parts.push(h('div.daily-result', { id: 'endless-result' }, [
      h('div.daily-score', { text: t('endless.held', { n: r.score }) }),
      r.newBest ? h('div.up-note', { text: t('endless.newBest') }) : null,
      ...r.chests.map((c) => h('div.rw-chips', rewardChips(c))),
    ]));
  }
  const actions = h('div.set-actions');
  const play = tagButton({ label: t('endless.play'), variant: 'green', id: 'endless-play' });
  onTap(play, () => p.onPlay(shopId), d);
  actions.appendChild(play);
  parts.push(actions);
  // Rivaux simulés de la semaine, avec le record du joueur.
  const rows = p.rivals.map((x) => ({ name: x.name, score: x.score, me: false }));
  if (e.best > 0) rows.push({ name: t('daily.you'), score: e.best, me: true });
  rows.sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
  parts.push(h('h3.set-h', { text: t('endless.rivals') }));
  parts.push(h('div.daily-rivals', rows.map((x, i) => h(`div.daily-rival${x.me ? '.me' : ''}`, [h('span', { text: `${i + 1}.` }), h('span', { text: x.name }), h('span', { text: fmt(x.score) })]))));
  const el = h('div.panel.slate-full.daily.endless', [h('div.up-list', parts.filter(Boolean))]);
  return {
    el,
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
