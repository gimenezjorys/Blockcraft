// Fort Boutique — catalogue (ardoise, G20.8) : cartes kraft (icône de jour + icône de nuit + prix),
// meubles verrouillés en silhouette avec « Niv. N », filtres Vendre / Défendre / Décorer.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG, furnitureIcon } from '../icons.js';
import { FURNITURE } from '../../data/furniture.js';
import { catalogIds, canBuy } from '../../game/catalog.js';
import { nextSlotSpot } from '../../game/plans.js';
import { expansionInfo } from '../../game/upgrades.js';

const FILTERS = ['all', 'sell', 'defend', 'decor'];

/**
 * @param {any} app
 * @param {{ g: any, onBuy: (id: string) => boolean, onClose: () => void }} p
 */
function mount(app, p, d) {
  const save = p.g.save;
  const shopId = p.g.shopId;
  let filter = 'all';
  const coins = h('span.money-n', { text: fmt(save.player.coins) });
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('hub.catalog') }), h('span.money', [h('span.money-ico', { html: SVG.coin }), coins])]);
  const filters = h('div.panel-filters');
  const grid = h('div.catalog-grid');
  for (const f of FILTERS) {
    const b = tagButton({ label: t(`catalog.${f}`), small: true, variant: f === filter ? 'green' : 'kraft' });
    b.dataset.filter = f;
    onTap(b, () => {
      filter = f;
      for (const x of filters.children) x.dataset.variant = x.dataset.filter === filter ? 'green' : 'kraft';
      render();
    }, d);
    filters.appendChild(b);
  }

  function card(id) {
    const def = FURNITURE[id];
    const c = canBuy(save, shopId, id);
    const locked = c.reason === 'level' || c.reason === 'district';
    const el = h('button.cat-card', { type: 'button', 'data-furniture': id });
    if (locked) el.classList.add('locked');
    if (c.reason === 'max') el.classList.add('maxed');
    const icons = h('div.cat-icons', [furnitureIcon(id, 40, false), furnitureIcon(id, 40, true)]);
    const name = h('div.cat-name', { text: locked ? '???' : t(`furn.${id}`) });
    let price;
    if (locked) price = h('div.cat-lock', [h('span.lock-ico', { html: SVG.lock }), h('span', { text: `${t('common.lvl')} ${def.unlockLevel}` })]);
    else if (c.reason === 'max') price = h('div.cat-price', { text: t('catalog.max') });
    else price = h('div.cat-price', [h('span.money-ico', { html: SVG.coin }), h('span', { text: fmt(c.price) })]);
    if (!c.ok && c.reason === 'coins') price.classList.add('short');
    const owned = h('div.cat-owned', { text: locked ? '' : `${c.owned}/${c.max}` });
    el.append(icons, name, h('div.cat-foot', [price, owned]));
    onTap(el, () => {
      const audio = app.services.audio;
      if (!canBuy(save, shopId, id).ok) {
        if (audio) audio.play('error');
        el.classList.remove('nope');
        void el.offsetWidth;
        el.classList.add('nope');
        return;
      }
      if (p.onBuy(id)) {
        if (audio) audio.play('build_pop');
        coins.textContent = fmt(save.player.coins);
        render();
      }
    }, d);
    return el;
  }

  function render() {
    grid.innerHTML = '';
    for (const id of catalogIds(shopId)) {
      const def = FURNITURE[id];
      const primary = def.tags.includes('decor') ? 'decor' : def.day.kind === 'producer' || def.day.kind === 'shelf' ? 'sell' : 'defend';
      if (filter !== 'all' && primary !== filter && !def.tags.includes(filter)) continue;
      grid.appendChild(card(id));
    }
  }
  render();
  // Boutique pleine (P4) : les achats iraient dans la Réserve ; on dit quoi faire (agrandir ou aménager).
  const shop = save.shops[shopId];
  // v1.1 (V3) : pleine quand aucun type d'emplacement (producteur, présentoir, défense) n'a de place libre.
  const full = !['cagette', 'etagere', 'comptoir'].some((id) => nextSlotSpot(shopId, shop, id));
  const banner = full ? h('div.up-note.cat-full', { id: 'catalog-full', text: t(expansionInfo(save, shopId).ok ? 'catalog.fullExpand' : 'catalog.full') }) : null;
  const el = h('div.panel.slate-full', [head, banner, filters, grid].filter(Boolean));
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
