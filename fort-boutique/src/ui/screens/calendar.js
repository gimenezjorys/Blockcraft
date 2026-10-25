// Fort Boutique — Calendrier de 7 jours (G15.1) et flamme de la boutique (G15.2). Sept étiquettes kraft sur une
// ficelle : celle du jour se balance, celle de demain montre un cadenas et le compte à rebours.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG, furnitureIcon } from '../icons.js';
import { CALENDAR } from '../../data/calendar.js';
import { calendarState, calendarChoices } from '../../game/calendar.js';
import { relightInfo, streakBonus, flameColor } from '../../game/streak.js';
import { rewardChips } from './reward.js';
import { countdown } from './quests.js';
import { now } from '../../core/time.js';

/** Flamme en SVG (orange, bleue à 30 jours, dorée à 100). */
export function flameSvg(color) {
  const c = { orange: ['#FF8A3D', '#FFD23F'], blue: ['#4FA3FF', '#BFE6FF'], gold: ['#FFC21A', '#FFF6C8'] }[color] || ['#FF8A3D', '#FFD23F'];
  return `<svg viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-4.5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z" fill="${c[0]}" stroke="#2B1A33" stroke-width="2" stroke-linejoin="round"/><path d="M12 13c1.5 1.5 3 2.5 3 4.5a3 3 0 0 1-6 0c0-1.5 1.5-3 3-4.5z" fill="${c[1]}"/></svg>`;
}

/**
 * @param {any} app
 * @param {{ save: any, onClaim: (choiceId?: string) => any, onRelight: () => boolean, onClose: () => void,
 *   adRelight?: { visible: () => boolean, ready: () => boolean, watch: (done: () => void) => void } | null }} p
 */
function mount(app, p, d) {
  const save = p.save;
  const sfx = (id) => app.services.audio && app.services.audio.play(id);
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back, id: 'calendar-close' });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('hub.calendar') })]);
  const string = h('div.cal-string');
  const choice = h('div.cal-choice');
  const flame = h('div.cal-flame');
  let lockLabel = null;

  function renderFlame() {
    flame.innerHTML = '';
    const s = save.daily.streak;
    const bonus = Math.round(streakBonus(save) * 100);
    flame.append(
      h('span.flame-ico', { html: flameSvg(flameColor(s.count)) }),
      h('div.up-text', [
        h('div.up-title', { text: t(s.count > 1 ? 'streak.days' : 'streak.day', { n: fmt(s.count) }) }),
        h('div.up-detail', { text: `${t('streak.bonus', { n: bonus })} · ${t('streak.freezes', { n: s.freezes })}` }),
      ]),
    );
    const info = relightInfo(save, now());
    if (info.open && s.count < info.count) {
      const b = tagButton({ label: t('streak.relight', { n: info.rubies }), small: true, variant: 'coral', icon: SVG.ruby, id: 'streak-relight' });
      if (save.player.rubies < info.rubies) b.classList.add('disabled');
      onTap(b, () => {
        if (!p.onRelight()) return sfx('error');
        sfx('upgrade');
        renderFlame();
      }, d);
      flame.appendChild(b);
      const a = p.adRelight;
      if (info.ad && a && a.visible()) {
        const ready = a.ready();
        const ab = tagButton({ label: t('streak.relightAd'), small: true, variant: 'gold', icon: ready ? SVG.tv : SVG.tvOff, id: 'streak-relight-ad' });
        if (!ready) ab.classList.add('disabled');
        onTap(ab, () => {
          if (!ready) {
            if (app.services.toast) app.services.toast(t('ad.unavailable'), SVG.tvOff);
            return;
          }
          a.watch(() => renderFlame());
        }, d);
        flame.appendChild(ab);
      }
    }
  }

  function render() {
    string.innerHTML = '';
    choice.innerHTML = '';
    lockLabel = null;
    const st = calendarState(save, now());
    CALENDAR.forEach((def, i) => {
      // Après J7 réclamé aujourd'hui, le tour suivant commence demain : les 7 étiquettes restent cochées.
      const past = i < st.index || (st.claimedToday && st.index === 0 && st.round > 0 && i > 0);
      const isToday = i === st.index && st.canClaim;
      const isNext = st.claimedToday ? i === st.index : false;
      const tag = h('div.cal-tag', { 'data-day': String(def.day) }, [
        h('span.cal-hole'),
        h('div.cal-day', { text: t('calendar.day', { n: def.day }) }),
        h('div.rw-chips', rewardChips(def.choice ? { plans: def.plans } : def)),
      ]);
      if (past && !isToday) tag.classList.add('cal-past');
      if (isToday) {
        tag.classList.add('cal-today');
        tag.id = 'calendar-today';
        onTap(tag, () => claim(), d);
      }
      if (isNext) {
        tag.classList.add('cal-locked');
        lockLabel = h('div.cal-count', { text: countdown(st.msLeft) });
        tag.append(h('span.cal-lock', { html: SVG.lock }), lockLabel);
      }
      string.appendChild(tag);
    });
    renderFlame();
  }

  function claim() {
    const st = calendarState(save, now());
    if (!st.canClaim) return;
    const def = CALENDAR[st.index];
    if (def.choice) {
      // J4 : 20 plans au choix parmi 3 meubles possédés.
      choice.innerHTML = '';
      choice.appendChild(h('div.up-note', { text: t('calendar.choose') }));
      const row = h('div.cal-choices');
      for (const id of calendarChoices(save)) {
        const b = h('button.cal-pick', { type: 'button', 'data-id': id, 'aria-label': t(`furn.${id}`) }, [furnitureIcon(id, 44), h('span', { text: t(`furn.${id}`) })]);
        onTap(b, () => done(p.onClaim(id)), d);
        row.appendChild(b);
      }
      choice.appendChild(row);
      return;
    }
    done(p.onClaim());
  }

  function done(res) {
    if (!res) return sfx('error');
    render();
  }

  render();
  const el = h('div.panel.slate-full.calendar', [head, flame, string, choice]);
  return {
    el,
    update() {
      if (lockLabel) {
        const txt = countdown(calendarState(save, now()).msLeft);
        if (lockLabel.textContent !== txt) lockLabel.textContent = txt;
      }
    },
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
