// Fort Boutique — Garde-robe (G17, niveau 6) : six onglets, des étiquettes « prix en rubis », Acheter puis Porter ;
// « +3 rubis » avec une pub (rw_daily_rubies, masqué sans régie). Rubis uniquement : rien ne s'achète en pièces.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG } from '../icons.js';
import { COSMETICS, COSMETIC_CATEGORIES } from '../../data/cosmetics.js';
import { cosmeticState } from '../../game/cosmetics.js';

/** Pastille de couleur d'un objet (aperçu simple, stable d'une partie à l'autre). */
function swatch(id) {
  let hsh = 0;
  for (let i = 0; i < id.length; i++) hsh = (hsh * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hsh % 360} 70% 62%)`;
}

/**
 * @param {any} app
 * @param {{ save: any, tab?: string, onBuy: (id: string) => boolean, onEquip: (id: string) => boolean,
 *   adRubies?: { visible: boolean, ready: boolean, onWatch: () => void }, onClose: () => void }} p
 */
function mount(app, p, d) {
  const save = p.save;
  let tab = COSMETIC_CATEGORIES.includes(p.tab) ? p.tab : 'outfit';
  const sfx = (id) => app.services.audio && app.services.audio.play(id);
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back, id: 'wardrobe-close' });
  onTap(back, () => p.onClose(), d);
  const rubies = h('span.money-n', { text: fmt(save.player.rubies) });
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('wardrobe.title') }), h('span.money', [h('span.money-ico', { html: SVG.ruby }), rubies])]);
  const tabs = h('div.panel-filters');
  const list = h('div.up-list.wardrobe-list');
  for (const k of COSMETIC_CATEGORIES) {
    const b = tagButton({ label: t(`wardrobe.${k}`), small: true, variant: k === tab ? 'green' : 'kraft', id: `wardrobe-tab-${k}` });
    b.dataset.tab = k;
    onTap(b, () => {
      tab = k;
      for (const x of tabs.children) x.dataset.variant = x.dataset.tab === tab ? 'green' : 'kraft';
      render();
    }, d);
    tabs.appendChild(b);
  }
  const extra = [];
  if (p.adRubies && p.adRubies.visible) {
    const ad = tagButton({ label: t('wardrobe.adRubies'), small: true, variant: 'gold', icon: SVG.tv, id: 'wardrobe-ad' });
    if (!p.adRubies.ready) ad.classList.add('disabled');
    onTap(ad, () => p.adRubies.onWatch(), d);
    extra.push(h('div.set-actions', [ad]));
  }

  function render() {
    list.innerHTML = '';
    rubies.textContent = fmt(save.player.rubies);
    const ids = Object.keys(COSMETICS).filter((id) => COSMETICS[id].cat === tab);
    for (const id of ids) {
      const st = cosmeticState(save, id);
      // Objets gagnés (événement, calendrier…) : visibles seulement une fois obtenus, pour ne rien promettre d'achetable.
      if (!st.owned && COSMETICS[id].price === null) continue;
      const def = COSMETICS[id];
      const dot = h('span.ward-swatch');
      dot.style.background = swatch(id);
      let btn;
      if (st.equipped) btn = tagButton({ label: t('wardrobe.worn'), small: true, variant: 'green' });
      else if (st.owned) btn = tagButton({ label: t('wardrobe.wear'), small: true, variant: 'kraft' });
      else btn = tagButton({ label: fmt(def.price), small: true, variant: st.reason ? 'kraft' : 'green', icon: SVG.ruby });
      if (!st.owned && st.reason) btn.classList.add('disabled');
      btn.id = `ward-${id}`;
      const detail = st.reason === 'season' ? t(`season.${def.season}`) : def.season ? t(`season.${def.season}`) : '';
      const row = h('div.up-row', { 'data-id': id }, [h('div.up-ico', [dot]), h('div.up-text', [h('div.up-title', { text: t(`cos.${id}`) }), h('div.up-detail', { text: detail })]), btn]);
      onTap(btn, () => {
        if (st.equipped && def.cat !== 'cat') return;
        const ok = st.owned ? p.onEquip(id) : p.onBuy(id);
        if (!ok) {
          sfx('error');
          return;
        }
        sfx(st.owned ? 'ui_tap' : 'upgrade');
        render();
      }, d);
      list.appendChild(row);
    }
  }
  render();
  const el = h('div.panel.slate-full.wardrobe', [head, tabs, ...extra, list]);
  return {
    el,
    refresh: render,
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
