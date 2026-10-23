// Fort Boutique — écran « Plans » (v1.1, V4), au Matin : 3 plans en mini-cartes dessinées (les meubles du joueur à
// leur future place, notes Clients et Défense tirées des vrais trajets), puis une grande vue où l'on échange deux
// meubles : un tap soulève, un tap sur une place du même type pose ou échange. « Annuler » revient à l'ouverture.
import { h, onTap, tagButton } from '../widgets.js';
import { t } from '../i18n.js';
import { SVG } from '../icons.js';
import { PALETTE as P } from '../../data/palette.js';
import { FURNITURE, footprint } from '../../data/furniture.js';
import { PLAN_IDS, PLANS_UNLOCK_LEVEL } from '../../data/shop-plans.js';
import { planSlots, planPreview, moveToSlot, rankStars, shopPlanId, slotTypeOf } from '../../game/plans.js';
import { pathLengths } from '../../game/catalog.js';
import { districtEntrances, doorCell } from '../../game/shop.js';
import { drawFurniture } from '../../render/sprites/furniture.js';

const SLOT_COLOR = { producteur: '#FF9F43', presentoir: '#4D96FF', defense: '#46D39A', caisse: '#FFD23F' };

/**
 * Dessine une boutique vue de dessus : sol, murs, porte, entrées, emplacements vides (pointillés), meubles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ shopId: string, expansion: number, planId: string, layout: any[], cs: number, lifted?: number, targets?: Set<string> }} o
 */
function drawPlan(ctx, o) {
  const S = planSlots(o.shopId, o.expansion, o.planId);
  const { w, h } = S;
  const cs = o.cs;
  const pad = 6;
  ctx.save();
  ctx.translate(pad, pad);
  // Mur et sol.
  ctx.fillStyle = P.encre;
  ctx.fillRect(-pad, -pad, w * cs + pad * 2, h * cs + pad * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#F3D59C' : '#EFCB8A';
      ctx.fillRect(x * cs, y * cs, cs, cs);
    }
  }
  // Porte et entrées des Grignotins.
  const door = doorCell(w, h);
  ctx.fillStyle = '#FF6B6B';
  ctx.fillRect(door.x * cs + cs * 0.15, (door.y + 1) * cs - 3, cs * 0.7, 6);
  for (const e of districtEntrances(o.shopId, w, h)) {
    if (e.overhead) continue;
    ctx.fillStyle = 'rgba(155, 93, 229, 0.35)';
    ctx.fillRect(e.x * cs + 2, e.y * cs + 2, cs - 4, cs - 4);
  }
  // Emplacements : pointillés de couleur (type), en surbrillance quand ils peuvent recevoir le meuble soulevé.
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = Math.max(1.5, cs / 22);
  for (const s of S.slots) {
    if (s.type === 'caisse') continue;
    const hot = o.targets && o.targets.has(s.id);
    ctx.strokeStyle = SLOT_COLOR[s.type];
    ctx.globalAlpha = hot ? 1 : 0.7;
    ctx.strokeRect(s.x * cs + 3, s.y * cs + 3, cs - 6, cs - 6);
    if (hot) {
      ctx.fillStyle = SLOT_COLOR[s.type];
      ctx.globalAlpha = 0.25;
      ctx.fillRect(s.x * cs + 3, s.y * cs + 3, cs - 6, cs - 6);
    }
  }
  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  // Meubles (de haut en bas) ; le meuble soulevé flotte au-dessus, avec une ombre plus grande.
  const k = cs / 48;
  const order = o.layout.map((it, i) => i).sort((a, b) => o.layout[a].y - o.layout[b].y);
  for (const i of order) {
    const it = o.layout[i];
    const def = FURNITURE[it.id];
    if (!def) continue;
    const [fw, fh] = footprint(def, it.rot || 0);
    const lifted = o.lifted === i;
    ctx.save();
    ctx.translate(it.x * cs, it.y * cs - (lifted ? cs * 0.18 : 0));
    if (lifted) {
      ctx.fillStyle = 'rgba(43, 26, 51, 0.28)';
      ctx.beginPath();
      ctx.ellipse((fw * cs) / 2, fh * cs + cs * 0.12, fw * cs * 0.48, cs * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.scale(k, k);
    drawFurniture(ctx, it.id, 0, 0, fw * 48, fh * 48, { night: 0, lookX: 0, lookY: 1, stock: 2, product: null, count: 0, cap: 4 });
    ctx.restore();
  }
  ctx.restore();
}

function canvasFor(w, h) {
  const c = document.createElement('canvas');
  const k = 2;
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  return c;
}

/** Étoiles pleines (dorées) puis vides (grises). */
const stars = (n) => h('span.plan-stars', { 'aria-label': `${n}/3` }, [h('span.on', { text: '★'.repeat(n) }), h('span.off', { text: '★'.repeat(3 - n) })]);

/**
 * @param {any} app
 * @param {{ g: any, onChoose: (planId: string, layout: any[], storage: string[], moves: number) => void, onClose: () => void }} p
 */
function mount(app, p, d) {
  const g = p.g;
  const shop = g.shop;
  const shopId = g.shopId;
  const exp = shop.expansion | 0;
  const level = g.save.player.level;
  const sfx = (id) => app.services.audio && app.services.audio.play(id);
  const current = shopPlanId(shop);
  const locked = (id) => id !== 'allee' && level < PLANS_UNLOCK_LEVEL;

  // Aperçus : le plan actuel tel quel ; les autres, rangés automatiquement (même type, ordre de remplissage).
  let previews;
  let selected;
  let lifted = -1;
  let moves = 0;
  function reset() {
    previews = {};
    for (const id of PLAN_IDS) {
      previews[id] = id === current ? { layout: shop.layout.map((it) => ({ ...it })), storage: (shop.storage || []).slice() } : planPreview(shopId, shop, id);
    }
    selected = current;
    lifted = -1;
    moves = 0;
  }
  reset();

  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('plans.title') })]);
  const cards = h('div.plans-cards');
  const bigWrap = h('div.plans-big');
  const hint = h('div.plans-hint', { text: t('plans.hint') });
  const cancel = tagButton({ label: t('plans.cancel'), small: true, id: 'plans-cancel' });
  const choose = tagButton({ label: t('plans.choose'), variant: 'green', id: 'plans-choose' });
  onTap(cancel, () => {
    sfx('ui_back');
    reset();
    render();
  }, d);
  onTap(choose, () => {
    if (locked(selected)) {
      sfx('error');
      choose.classList.remove('nope');
      void choose.offsetWidth;
      choose.classList.add('nope');
      return;
    }
    sfx('upgrade');
    const pr = previews[selected];
    p.onChoose(selected, pr.layout, pr.storage, moves);
  }, d);

  // Grande vue : taille de case pour tenir dans 280 × 260 px.
  const S0 = planSlots(shopId, exp, current);
  const cs = Math.floor(Math.min(280 / S0.w, 260 / S0.h));
  const bw = S0.w * cs + 12;
  const bh = S0.h * cs + 12;
  const big = canvasFor(bw, bh);
  big.className = 'plans-canvas';
  big.id = 'plans-big';
  bigWrap.appendChild(big);

  function targetsFor(i) {
    const out = new Set();
    if (i < 0) return out;
    const lay = previews[selected].layout;
    for (const s of planSlots(shopId, exp, selected).slots) {
      if (s.type !== slotTypeOf(lay[i].id) || s.type === 'caisse') continue;
      if (moveToSlot(shopId, exp, selected, lay, i, s.id)) out.add(s.id);
    }
    return out;
  }

  function drawBig() {
    const ctx = big.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    drawPlan(ctx, { shopId, expansion: exp, planId: selected, layout: previews[selected].layout, cs, lifted, targets: targetsFor(lifted) });
  }

  function render() {
    cards.innerHTML = '';
    const L = PLAN_IDS.map((id) => pathLengths(shopId, exp, previews[id].layout));
    const clients = rankStars(L.map((x) => x.customers), false);
    const defense = rankStars(L.map((x) => x.monsters), true);
    const S = planSlots(shopId, exp, 'allee');
    const mcs = Math.floor(Math.min(96 / S.w, 96 / S.h));
    PLAN_IDS.forEach((id, i) => {
      const card = h('button.plan-card', { type: 'button', id: `plan-${id}`, 'data-plan': id });
      if (id === selected) card.classList.add('selected');
      if (locked(id)) card.classList.add('locked');
      const mini = canvasFor(S.w * mcs + 12, S.h * mcs + 12);
      const ctx = mini.getContext('2d');
      if (ctx) {
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        drawPlan(ctx, { shopId, expansion: exp, planId: id, layout: previews[id].layout, cs: mcs });
      }
      const name = h('div.plan-name', { text: t(`plan.${id}`) });
      const notes = h('div.plan-notes', [
        h('div.plan-note', [h('span', { text: t('plans.clients') }), stars(clients[i])]),
        h('div.plan-note', [h('span', { text: t('plans.defense') }), stars(defense[i])]),
      ]);
      card.append(mini, name, notes);
      if (id === current) card.appendChild(h('span.plan-current', { text: t('plans.current') }));
      if (locked(id)) card.appendChild(h('span.lvl-badge.req-badge', [h('span.req-ico', { html: SVG.lock }), h('span', { text: String(PLANS_UNLOCK_LEVEL) })]));
      onTap(card, () => {
        if (selected === id) return;
        sfx(locked(id) ? 'error' : 'ui_tap');
        selected = id;
        lifted = -1;
        render();
      }, d);
      cards.appendChild(card);
    });
    drawBig();
    const st = previews[selected].storage.length;
    hint.textContent = st ? t('plans.hintStorage', { n: st }) : t('plans.hint');
  }

  // Tap sur la grande vue : soulever, puis poser ou échanger (même type d'emplacement).
  onTap(big, (e) => {
    const pt = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
    const r = big.getBoundingClientRect();
    const x = Math.floor((pt.clientX - r.left - 6) / cs);
    const y = Math.floor((pt.clientY - r.top - 6) / cs);
    const lay = previews[selected].layout;
    const at = lay.findIndex((it) => {
      const [fw, fh] = footprint(FURNITURE[it.id] || { size: [1, 1] }, it.rot || 0);
      return x >= it.x && x < it.x + fw && y >= it.y && y < it.y + fh;
    });
    if (lifted < 0) {
      if (at < 0 || lay[at].id === 'caisse') return;
      lifted = at;
      sfx('pickup');
      drawBig();
      return;
    }
    if (at === lifted) {
      lifted = -1;
      drawBig();
      return;
    }
    const slot = planSlots(shopId, exp, selected).slots.find((s) => s.x === x && s.y === y);
    const next = slot ? moveToSlot(shopId, exp, selected, lay, lifted, slot.id) : null;
    if (!next) {
      // Autre meuble touché : c'est lui qu'on soulève ; sinon, un petit « non ».
      if (at >= 0 && lay[at].id !== 'caisse') {
        lifted = at;
        sfx('pickup');
      } else sfx('error');
      drawBig();
      return;
    }
    previews[selected].layout = next;
    moves++;
    lifted = -1;
    sfx('drop');
    render();
  }, d);

  render();
  const el = h('div.panel.slate-full.plans-panel', [head, cards, bigWrap, hint, h('div.plans-actions', [cancel, choose])]);
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
