// Fort Boutique — petite fenêtre de récompense (quêtes, calendrier) : les gains en pastilles, un tap ferme.
import { h, onTap } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG, furnitureIcon, chestSvg } from '../icons.js';

/** Une pastille « icône + nombre ». */
function chip(iconEl, n) {
  return h('span.rw-chip', [iconEl, h('span.rw-n', { text: n })]);
}
const ico = (svg) => h('span.rw-ico', { html: svg });

/**
 * Pastilles d'une récompense (résumé de grantReward, ou définition de données).
 * @param {any} r
 * @returns {HTMLElement[]}
 */
export function rewardChips(r) {
  if (!r) return [];
  const out = [];
  const c = r.chest && typeof r.chest === 'object' ? r.chest : null;
  const coins = (r.coins || 0) + (c ? c.coins : 0);
  const rubies = (r.rubies || 0) + (c ? c.rubies : 0);
  const kibble = (r.kibble || 0) + (c ? c.kibble : 0);
  if (typeof r.chest === 'string') out.push(h('span.rw-chip.rw-chest', { html: chestSvg(r.chest) }));
  if (coins) out.push(chip(ico(SVG.coin), fmt(coins)));
  if (rubies) out.push(chip(ico(SVG.ruby), fmt(rubies)));
  if (kibble) out.push(chip(ico(SVG.kibble), fmt(kibble)));
  const plans = [...(Array.isArray(r.plans) ? r.plans : []), ...(c ? c.plans : [])];
  for (const [id, n] of plans) out.push(chip(furnitureIcon(id, 28), `+${fmt(n)}`));
  if (typeof r.plans === 'number') out.push(chip(ico(SVG.plan), fmt(r.plans)));
  const cosmetic = r.cosmetic || (c && c.cosmetic);
  if (cosmetic) out.push(chip(ico(SVG.star), t('reward.cosmetic')));
  return out;
}

/**
 * @param {any} app
 * @param {{ title: string, rewards: any[], onClose: () => void }} p
 */
function mount(app, p, d) {
  const chips = p.rewards.flatMap((r) => rewardChips(r));
  const panel = h('div.slate.reward-panel', [
    h('h2.sticker.reward-title', { text: p.title }),
    h('div.rw-chips', chips),
    h('div.reward-tap', { text: t('reward.tap') }),
  ]);
  const el = h('div.overlay.reward', [panel]);
  if (app.services.audio) app.services.audio.play('quest');
  onTap(el, () => p.onClose(), d);
  return {
    el,
    onKey() {
      p.onClose();
      return true;
    },
  };
}

export default { mount, overlay: true };
