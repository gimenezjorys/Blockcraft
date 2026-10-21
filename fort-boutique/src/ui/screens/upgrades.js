// Fort Boutique — Améliorer (G20.8) : onglets Meubles, Marchand, Recettes, Boutique.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG, furnitureIcon, productIcon } from '../icons.js';
import { FURNITURE } from '../../data/furniture.js';
import { MERCHANT_UPGRADE_IDS } from '../../data/merchant.js';
import { districtDef } from '../../data/districts.js';
import { canUpgrade, furnitureLevelCap } from '../../game/economy.js';
import { unlockedFurniture, isUnlocked } from '../../game/progression.js';
import { merchantUpgradeInfo, recipeInfo, expansionInfo } from '../../game/upgrades.js';
import { upgradeStatsEl } from '../upgrade-preview.js';
import { FEATURE_LEVELS } from '../../data/unlocks.js';
import { RECIPES } from '../../data/balance.js';

const TABS = ['furniture', 'merchant', 'recipes', 'shop'];

/**
 * @param {any} app
 * @param {{ g: any, tab?: string, onUpgradeFurniture: (id: string) => boolean, onMerchant: (id: string) => boolean,
 *   onRecipe: (product: string) => boolean, onExpand: () => boolean, onClose: () => void }} p
 */
function mount(app, p, d) {
  const g = p.g;
  const save = g.save;
  let tab = TABS.includes(p.tab) ? p.tab : 'furniture';
  const coins = h('span.money-n', { text: fmt(save.player.coins) });
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('hub.upgrades') }), h('span.money', [h('span.money-ico', { html: SVG.coin }), coins])]);
  const tabs = h('div.panel-filters');
  const list = h('div.up-list');
  const sfx = (id) => app.services.audio && app.services.audio.play(id);

  for (const k of TABS) {
    const b = tagButton({ label: t(`upgrades.${k}`), small: true, variant: k === tab ? 'green' : 'kraft' });
    b.dataset.tab = k;
    onTap(b, () => {
      tab = k;
      for (const x of tabs.children) x.dataset.variant = x.dataset.tab === tab ? 'green' : 'kraft';
      render();
    }, d);
    tabs.appendChild(b);
  }

  function row(icon, title, detail, cost, ok, onBuy, id, extra) {
    const btn = tagButton({ label: cost === null ? t('catalog.max') : fmt(cost), variant: ok ? 'green' : 'kraft', small: true, icon: cost === null ? undefined : SVG.coin });
    if (!ok) btn.classList.add('disabled');
    const text = h('div.up-text', [h('div.up-title', { text: title }), h('div.up-detail', { text: detail })]);
    if (extra) text.appendChild(extra);
    const r = h('div.up-row', { 'data-id': id }, [h('div.up-ico', [icon]), text, btn]);
    onTap(btn, () => {
      if (!ok || !onBuy()) {
        sfx('error');
        btn.classList.remove('nope');
        void btn.offsetWidth;
        btn.classList.add('nope');
        return;
      }
      sfx('upgrade');
      coins.textContent = fmt(save.player.coins);
      render();
    }, d);
    return r;
  }

  function render() {
    list.innerHTML = '';
    if (tab === 'furniture') {
      const cap = furnitureLevelCap(save.player.level);
      list.appendChild(h('div.up-note', { text: t('upgrades.cap', { n: cap }) }));
      for (const id of unlockedFurniture(save)) {
        const u = canUpgrade(save, id);
        const need = u.cost ? `${u.plans}/${u.cost.plans}` : t('catalog.max');
        const detail = u.reason === 'cap' ? t('upgrades.capReached', { n: cap }) : `${need} ${t('upgrades.plans')}`;
        list.appendChild(row(furnitureIcon(id, 40), `${t(`furn.${id}`)} · ${t('common.lvl')} ${u.level}`, detail, u.cost ? u.cost.coins : null, u.ok, () => p.onUpgradeFurniture(id), id, u.cost ? upgradeStatsEl(id, u.level) : null));
      }
    } else if (tab === 'merchant') {
      if (!isUnlocked(save, 'merchantUpgrades')) list.appendChild(h('div.up-note', { text: t('upgrades.lockedAt', { n: FEATURE_LEVELS.merchantUpgrades }) }));
      for (const id of MERCHANT_UPGRADE_IDS) {
        const info = merchantUpgradeInfo(save, id);
        list.appendChild(row(h('span.up-emoji', { html: SVG.star }), `${t(`up.${id}`)} · ${t('common.lvl')} ${info.level}/${info.max}`, t(`upgrades.effect.${id}`), info.cost, info.ok, () => p.onMerchant(id), id));
      }
    } else if (tab === 'recipes') {
      if (save.player.level < RECIPES.unlockLevel) list.appendChild(h('div.up-note', { text: t('upgrades.lockedAt', { n: RECIPES.unlockLevel }) }));
      for (const prod of districtDef(g.shopId).products) {
        const info = recipeInfo(save, g.shopId, prod);
        const bonus = Math.round(RECIPES.bonusPerLevel * 100 * (info.level - 1));
        list.appendChild(row(productIcon(prod, 32), `${t(`prod.${prod}`)} · ${t('common.lvl')} ${info.level}/${RECIPES.maxLevel}`, t('upgrades.recipeDetail', { n: bonus }), info.cost, info.ok, () => p.onRecipe(prod), prod));
      }
    } else {
      const info = expansionInfo(save, g.shopId);
      const title = info.reason === 'max' ? t('upgrades.expandMax') : t('upgrades.expand', { n: info.to });
      const detail = info.reason === 'level' ? t('upgrades.lockedAt', { n: info.level }) : t('upgrades.expandDetail');
      list.appendChild(row(furnitureIcon('comptoir', 40), title, detail, info.cost, info.ok, () => p.onExpand(), 'expand'));
    }
  }
  render();
  void FURNITURE;
  const el = h('div.panel.slate-full', [head, tabs, list]);
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
