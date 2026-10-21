// Fort Boutique — panneau de triche (?debug=1, B14). Actif uniquement avec le paramètre.
import { beginClosing } from '../game/day/day.js';
import { finishNight } from '../game/night/night.js';
import { FURNITURE_IDS } from '../data/furniture.js';
import { DISTRICT_IDS } from '../data/districts.js';
import { defaultShop } from '../save/schema.js';

/**
 * @param {{ game: () => any, advanceClock: (ms: number) => void, onChange: () => void }} host
 * @returns {Array<{ id: string, label: string, run: () => void }>}
 */
export function buildCheats(host) {
  const save = () => (host.game() ? host.game().save : null);
  return [
    {
      id: 'coins',
      label: '+10 000 pièces',
      run() {
        const s = save();
        if (s) s.player.coins += 10000;
        host.onChange();
      },
    },
    {
      id: 'plans',
      label: '+100 plans',
      run() {
        const s = save();
        if (!s) return;
        for (const id of FURNITURE_IDS) {
          if (!s.furniture[id]) s.furniture[id] = { level: 1, plans: 0 };
          s.furniture[id].plans += 100;
        }
        host.onChange();
      },
    },
    {
      id: 'skip',
      label: 'Passer la phase',
      run() {
        const g = host.game();
        if (!g) return;
        const name = g.phase.name;
        if (name === 'day') beginClosing(g);
        else if (name === 'closing') g.phase.t = 99;
        else if (name === 'dusk') g.phase.t = 99;
        else if (name === 'night' && g.night) finishNight(g, true);
        else if (host.skip) host.skip(name);
        host.onChange();
      },
    },
    {
      id: 'day',
      label: 'Aller au jour N',
      run() {
        const g = host.game();
        if (!g) return;
        const n = Number(globalThis.prompt ? globalThis.prompt('Jour ?', String(g.shop.day + 1)) : g.shop.day + 1);
        if (Number.isFinite(n) && n >= 1) {
          g.shop.day = Math.floor(n);
          g.shop.night = ((Math.floor(n) - 1) % 7) + 1;
        }
        host.onChange();
      },
    },
    {
      id: 'clock',
      label: 'Horloge +1 jour',
      run() {
        host.advanceClock(86400000);
        host.onChange();
      },
    },
    {
      id: 'unlock',
      label: 'Tout débloquer',
      run() {
        const s = save();
        if (!s) return;
        s.player.level = Math.max(s.player.level, 30);
        for (const id of DISTRICT_IDS) {
          if (!s.shops[id]) s.shops[id] = defaultShop(id);
          s.shops[id].unlocked = true;
          s.shops[id].bossBeatenCount = Math.max(1, s.shops[id].bossBeatenCount);
        }
        host.onChange();
      },
    },
  ];
}
