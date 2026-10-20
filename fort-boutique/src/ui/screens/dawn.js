// Fort Boutique — l'Aube (G8.5, G19 2:25) : le ticket s'imprime ligne par ligne, les étoiles tombent,
// le coffre tremble (3 taps) puis les cartes sortent une par une. Un tap accélère ; rien ne bloque.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG, chestSvg, furnitureIcon } from '../icons.js';
import { canUpgrade } from '../../game/economy.js';
import { levelProgress } from '../../game/progression.js';
import { upgradeStatsEl } from '../upgrade-preview.js';
import { CHEST_TAPS } from '../../data/chests.js';

const LINE_GAP = 0.35;

/**
 * @param {any} app
 * @param {{ dawn: any, save: any, onOpenChest: () => any, onUpgrade: (id: string) => boolean, onContinue: () => void,
 *   onDouble?: () => void, adReady?: () => boolean }} p
 */
function mount(app, p, d) {
  const dawn = p.dawn;
  const r = dawn.result;
  const pct = Math.round(r.kept * 100);
  const total = dawn.day.sales + dawn.day.tips + r.jarFinal + r.loot;
  const lines = [
    ['dawn.sales', fmt(dawn.day.sales)],
    ['dawn.tips', fmt(dawn.day.tips)],
    ['dawn.kept', `${pct} %`],
    ['dawn.jar', `+${fmt(r.jarFinal)}`],
    ['dawn.loot', `+${fmt(r.loot)}`],
  ];
  const lineEls = lines.map(([k, v]) => h('div.ticket-line', [h('span', { text: t(k) }), h('span.ticket-num', { text: v })]));
  const totalEl = h('div.ticket-line.total', [h('span', { text: t('dawn.total') }), h('span.ticket-num', { text: fmt(total) })]);
  const starEls = [0, 1, 2].map((i) => h('span.dawn-star', { 'data-i': i, html: SVG.starEmpty }));
  const starsRow = h('div.ticket-stars', starEls);
  const ticket = h('div.ticket', [
    h('div.ticket-head', [h('div.ticket-shop', { text: t('game.name') }), h('div.ticket-sub', { text: t('dawn.receipt') })]),
    ...lineEls,
    h('div.ticket-sep'),
    totalEl,
    starsRow,
    h('div.ticket-edge'),
  ]);
  for (const el of [...lineEls, totalEl]) el.classList.add('hidden');
  const chestWrap = h('button.dawn-chest', { type: 'button', 'aria-label': t('dawn.chest'), html: dawn.chest ? chestSvg(dawn.chest.type) : '' });
  chestWrap.hidden = true;
  const cards = h('div.dawn-cards');
  const doubleBtn = tagButton({ label: t('ads.double'), variant: 'gold', icon: SVG.tv, small: true, id: 'dawn-double' });
  const contBtn = tagButton({ label: t('common.continue'), variant: 'green', id: 'dawn-continue' });
  const actions = h('div.dawn-actions', [doubleBtn, contBtn]);
  actions.hidden = true;
  // Ruban de niveau (G19 2:57) : gros chiffre-sticker, barre d'XP, confettis CSS.
  const lv = dawn.level && dawn.level.to > dawn.level.from ? dawn.level.to : 0;
  const xpFill = h('span.xp-fill');
  const ribbon = lv
    ? h('div.dawn-level', { 'data-level': lv }, [
        h('span.level-num', { text: String(lv) }),
        h('span.level-text', { text: t('level.banner', { n: lv }) }),
        h('span.xp-bar', [xpFill]),
        h('span.confetti', { 'aria-hidden': 'true' }, Array.from({ length: 12 }, (_, i) => h('i', { style: `--i:${i}` }))),
      ])
    : null;
  if (ribbon) ribbon.hidden = true;
  const el = h('div.dawn', [ticket, chestWrap, cards, ribbon, actions]);

  const st = { t: 0, revealed: 0, starsShown: 0, taps: 0, opened: !!(dawn.chest && dawn.chest.opened), cardsQueued: [], cardT: 0, fast: false };
  const audio = () => app.services.audio;
  const sfx = (id, o) => audio() && audio().play(id, o);

  function refreshDouble() {
    const ready = p.adReady ? p.adReady() : false;
    doubleBtn.classList.toggle('disabled', !ready || dawn.adDoubled);
    doubleBtn.querySelector('.tag-icon').innerHTML = ready ? SVG.tv : SVG.tvOff;
    // G18.3 : jamais de proposition de pub pendant les 10 premières minutes.
    doubleBtn.hidden = dawn.adDoubled || r.coins <= 0 || (p.adOffer ? !p.adOffer() : false);
  }

  function planCard(id, n) {
    const c = h('div.card.card-plan', { 'data-furniture': id });
    const info = h('div.card-info');
    const up = h('button.card-up', { type: 'button', 'aria-label': t('dawn.upgrade'), html: SVG.arrowUp });
    const cost = h('span.card-cost', [h('span.money-ico', { html: SVG.coin }), h('span', { text: '' })]);
    const render = () => {
      const u = canUpgrade(p.save, id);
      const need = u.cost ? u.cost.plans : 0;
      info.innerHTML = '';
      info.append(h('span.card-n', { text: `×${n}` }), h('span.card-prog', { text: need ? `${u.plans}/${need}` : 'MAX' }), h('span.card-lvl', { text: `${t('common.lvl')} ${u.level}` }));
      // Ce que l'on gagne et ce que l'on paie (Hugo, P1) : « ⚔ 6→7 » et le prix en pièces sous la flèche.
      if (u.cost) info.append(upgradeStatsEl(id, u.level, 1));
      up.hidden = !u.ok;
      cost.hidden = !u.ok;
      if (u.cost) cost.lastChild.textContent = fmt(u.cost.coins);
      c.classList.toggle('can-up', u.ok);
    };
    onTap(up, () => {
      if (p.onUpgrade(id)) {
        sfx('upgrade');
        c.classList.remove('jump');
        void c.offsetWidth;
        c.classList.add('jump');
        render();
        for (const other of cards.querySelectorAll('.card-plan')) if (other !== c && other._render) other._render();
      }
    }, d);
    c._render = render;
    c.append(furnitureIcon(id, 44), info, up, cost);
    render();
    return c;
  }

  function resourceCard(kind, n) {
    return h('div.card.card-res', { 'data-kind': kind }, [h('span.card-ico', { html: SVG[kind] }), h('span.card-n', { text: `+${fmt(n)}` })]);
  }

  function queueCards(content) {
    st.cardsQueued = [];
    for (const [id, n] of content.plans) st.cardsQueued.push(() => planCard(id, n));
    if (content.coins) st.cardsQueued.push(() => resourceCard('coin', content.coins));
    if (content.kibble) st.cardsQueued.push(() => resourceCard('kibble', content.kibble));
    if (content.rubies) st.cardsQueued.push(() => resourceCard('ruby', content.rubies));
    st.cardT = 0;
  }

  function openChest() {
    const content = p.onOpenChest();
    st.opened = true;
    chestWrap.classList.add('open');
    sfx('chest_open');
    if (content) queueCards(content);
  }

  onTap(chestWrap, () => {
    if (st.opened || chestWrap.hidden) return;
    st.taps++;
    chestWrap.dataset.taps = String(st.taps);
    chestWrap.classList.remove('shake');
    void chestWrap.offsetWidth;
    chestWrap.classList.add('shake');
    sfx('chest_tap', { n: st.taps });
    if (app.services.vibrate) app.services.vibrate(30);
    if (st.taps >= CHEST_TAPS) openChest();
  }, d);
  onTap(contBtn, () => p.onContinue(), d);
  onTap(doubleBtn, () => {
    if (doubleBtn.classList.contains('disabled')) {
      if (app.services.toast) app.services.toast(t('ads.unavailable'), SVG.tvOff);
      return;
    }
    if (p.onDouble) p.onDouble();
    refreshDouble();
  }, d);
  // Tap n'importe où : accélère l'impression du ticket.
  onTap(ticket, () => { st.fast = true; }, d);
  refreshDouble();

  function showLevel() {
    if (!ribbon || !ribbon.hidden) return;
    ribbon.hidden = false;
    ribbon.classList.add('drop');
    xpFill.style.width = `${Math.round(levelProgress(p.save.player) * 100)}%`;
    sfx('level_up');
  }

  const showStars = () => {
    starEls.forEach((s, i) => {
      if (i < r.stars) s.innerHTML = SVG.star;
    });
  };

  return {
    el,
    update(dt) {
      st.t += dt * (st.fast ? 4 : 1);
      // Lignes du ticket.
      const all = [...lineEls, totalEl];
      while (st.revealed < all.length && st.t >= 0.3 + st.revealed * LINE_GAP) {
        all[st.revealed].classList.remove('hidden');
        all[st.revealed].classList.add('printed');
        sfx('pad_tick', { n: st.revealed * 5 });
        st.revealed++;
      }
      // Étoiles.
      const starStart = 0.3 + all.length * LINE_GAP + 0.2;
      while (st.starsShown < r.stars && st.t >= starStart + st.starsShown * 0.4) {
        const s = starEls[st.starsShown];
        s.innerHTML = SVG.star;
        s.classList.add('stamp');
        sfx('star', { n: st.starsShown });
        st.starsShown++;
      }
      const chestAt = starStart + 3 * 0.4 + 0.2;
      if (st.t >= chestAt) {
        if (dawn.chest && !st.opened && chestWrap.hidden) {
          chestWrap.hidden = false;
          chestWrap.classList.add('appear');
        }
        if (dawn.chest && dawn.chest.opened && !cards.childElementCount && !st.cardsQueued.length && dawn.chest.content) queueCards(dawn.chest.content);
        if (!dawn.chest || st.opened) {
          if (actions.hidden) showLevel();
          actions.hidden = false;
        }
      }
      if (st.cardsQueued.length) {
        st.cardT -= dt;
        if (st.cardT <= 0) {
          const make = st.cardsQueued.shift();
          const c = make();
          c.classList.add('fly-in');
          cards.appendChild(c);
          sfx('card', { n: cards.childElementCount });
          st.cardT = 0.25;
          if (dawn.chest && st.opened) chestWrap.hidden = true;
        }
      }
    },
    onKey(key) {
      if (key === 'Enter' && !actions.hidden) {
        p.onContinue();
        return true;
      }
      return false;
    },
    showAllNow() {
      st.t = 99;
      showStars();
    },
  };
}

export default { mount };
