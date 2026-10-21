// Fort Boutique — cartes de déblocage du Matin (G12.4) : une carte par déblocage (3 au plus, les autres regroupées),
// silhouette qui se révèle. Un tap pour continuer.
import { h, onTap, tagButton } from '../widgets.js';
import { t } from '../i18n.js';
import { furnitureIcon, featureIconSvg } from '../icons.js';
import { unlocksAtLevel, districtOpen } from '../../game/progression.js';
import { UNLOCK_CARD_ORDER } from '../../data/unlocks.js';

const DISTRICT_FEATURES = ['q2', 'q3', 'q4', 'q5'];

/**
 * Déblocages à fêter pour une liste de niveaux atteints (et des quartiers ouverts par un boss vaincu).
 * Un quartier n'a sa carte que s'il est vraiment ouvert : boss précédent vaincu ET niveau (G12.4).
 * @param {number[]} levels
 * @param {{ save?: any, districts?: string[] }} [o]
 * @returns {Array<{ kind: 'feature' | 'furniture', id: string, level: number }>}
 */
export function unlockCards(levels, o = {}) {
  const out = [];
  const seen = new Set();
  for (const id of o.districts || []) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ kind: 'feature', id, level: 0 });
  }
  for (const lvl of levels) {
    const u = unlocksAtLevel(lvl);
    const feats = u.features
      .filter((f) => UNLOCK_CARD_ORDER.includes(f))
      .filter((f) => !DISTRICT_FEATURES.includes(f) || (o.save && districtOpen(o.save, f) && !seen.has(f)))
      .sort((a, b) => UNLOCK_CARD_ORDER.indexOf(a) - UNLOCK_CARD_ORDER.indexOf(b));
    for (const f of u.furniture) out.push({ kind: 'furniture', id: f, level: lvl });
    for (const f of feats) {
      out.push({ kind: 'feature', id: f, level: lvl });
      seen.add(f);
    }
  }
  // Ordre d'affichage : quartiers d'abord, puis meubles, puis fonctions (ordre de M7 conservé).
  const rank = (c) => (DISTRICT_FEATURES.includes(c.id) ? 0 : c.kind === 'furniture' ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b));
}

/**
 * @param {any} app
 * @param {{ levels: number[], districts?: string[], save?: any, onDone: () => void }} p
 */
function mount(app, p, d) {
  const cards = unlockCards(p.levels, { save: p.save, districts: p.districts });
  const shown = cards.slice(0, 3);
  const rest = cards.length - shown.length;
  const top = p.levels.length ? Math.max(...p.levels) : 0;
  const row = h('div.unlock-row');
  shown.forEach((c, i) => {
    const icon = c.kind === 'furniture' ? furnitureIcon(c.id, 56) : h('div.unlock-feat', { html: featureIconSvg(c.id) });
    const card = h('div.card.unlock-card', { 'data-unlock': c.id, style: { animationDelay: `${0.2 + i * 0.25}s` } }, [
      h('div.unlock-icon', [icon]),
      h('div.unlock-name', { text: t(c.kind === 'furniture' ? `furn.${c.id}` : `feat.${c.id}`) }),
    ]);
    row.appendChild(card);
  });
  if (rest > 0) row.appendChild(h('div.card.unlock-more', { text: `+${rest}` }));
  const ok = tagButton({ label: t('common.continue'), variant: 'green', id: 'unlock-ok' });
  const title = top ? `${t('common.lvl')} ${top} !` : t('unlock.new');
  const panel = h('div.slate.unlock-panel', [h('h2.sticker.unlock-title', { text: title }), row, ok]);
  const el = h('div.overlay', [panel]);
  onTap(ok, () => p.onDone(), d);
  onTap(el, (e) => {
    if (e.target === el) p.onDone();
  }, d);
  if (app.services.audio) app.services.audio.play('level_up');
  return {
    el,
    onKey(key) {
      if (key === 'Enter' || key === 'Escape') {
        p.onDone();
        return true;
      }
      return true;
    },
  };
}

export default { mount, overlay: true };
