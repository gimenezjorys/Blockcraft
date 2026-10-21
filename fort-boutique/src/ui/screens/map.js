// Fort Boutique — carte des quartiers (G13.1, G12.4) : la rue du village, 5 façades ; un quartier s'ouvre quand
// le boss précédent est vaincu ET le niveau atteint (sinon la façade dit ce qui manque).
import { h, onTap, tagButton } from '../widgets.js';
import { t } from '../i18n.js';
import { SVG, monsterIcon } from '../icons.js';
import { DISTRICTS, DISTRICT_IDS } from '../../data/districts.js';
import { districtOpen, levelProgress } from '../../game/progression.js';

/**
 * État d'une façade.
 * @param {any} save
 * @param {string} id
 * @param {string} current
 * @param {string[]} playable quartiers dont le contenu est prêt
 * @returns {'here' | 'open' | 'soon' | 'level' | 'boss'}
 */
export function districtStatus(save, id, current, playable) {
  if (id === current) return 'here';
  const d = DISTRICTS[id];
  if (districtOpen(save, id)) return playable.includes(id) ? 'open' : 'soon';
  const prev = d.previousBoss ? save.shops[d.previousBoss] : null;
  if (prev && prev.bossBeatenCount > 0) return 'level';
  return 'boss';
}

/**
 * @param {any} app
 * @param {{ save: any, current: string, playable: string[], onGo: (id: string) => void, onClose: () => void }} p
 */
function mount(app, p, d) {
  const save = p.save;
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('hub.map') })]);
  const street = h('div.map-street');
  for (const id of DISTRICT_IDS) {
    const def = DISTRICTS[id];
    const st = districtStatus(save, id, p.current, p.playable);
    const awning = h('div.map-awning', { style: { background: def.accent } });
    const name = h('div.map-name', { text: t(`district.${id}`) });
    let status;
    if (st === 'here') status = h('div.map-status.here', [h('span.map-ico', { html: SVG.check }), h('span', { text: t('map.here') })]);
    else if (st === 'open') {
      status = tagButton({ label: t('map.go'), variant: 'green', small: true, id: `map-go-${id}` });
      onTap(status, () => p.onGo(id), d);
    } else if (st === 'soon') status = h('div.map-status', [h('span.map-ico', { html: SVG.lock }), h('span', { text: t('hub.soon') })]);
    else if (st === 'level') {
      const fill = h('span.xp-fill');
      fill.style.width = `${Math.round(levelProgress(save.player) * 100)}%`;
      status = h('div.map-status', [h('span', { text: t('map.needLevel', { n: def.requiredLevel }) }), h('span.xp-bar', [fill])]);
    } else {
      const prevBoss = DISTRICTS[def.previousBoss].boss;
      status = h('div.map-status', [h('span.map-ico', { html: SVG.lock }), h('span.map-boss', [monsterIcon(prevBoss, 28)]), h('span', { text: `+ ${t('common.lvl')} ${def.requiredLevel}` })]);
    }
    const facade = h('div.map-facade', { 'data-district': id, 'data-status': st }, [awning, h('div.map-body', [name, status])]);
    if (st === 'boss' || st === 'level' || st === 'soon') facade.classList.add('locked');
    street.appendChild(facade);
  }
  const el = h('div.panel.slate-full', [head, street]);
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
