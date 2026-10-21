// Fort Boutique — couche DOM au-dessus du canvas pendant le jeu : l'étiquette d'objectif (G3.5), en haut à gauche.
// Tout le reste du HUD est dessiné sur le canvas (render/hud.js). La couche laisse passer les gestes (joystick partout).
import { h } from '../widgets.js';
import { createObjective } from '../objective.js';

export default {
  /**
   * @param {any} app
   * @param {{ game?: () => any, onObjective?: (o: any, el: HTMLElement) => void }} p
   */
  mount(app, p, d) {
    const el = h('div.hud-layer.passthrough');
    if (!p.game) return { el };
    const obj = createObjective(p.game, (o) => p.onObjective && p.onObjective(o, obj.el), d);
    el.appendChild(obj.el);
    let shown = null;
    return {
      el,
      update() {
        const g = p.game();
        // Matin et Jour seulement (G3.5) ; la fermeture fait partie de la journée.
        const show = !!g && (g.phase.name === 'day' || g.phase.name === 'closing');
        if (show !== shown) {
          shown = show;
          obj.el.hidden = !show;
        }
        if (show) obj.update();
      },
    };
  },
};
