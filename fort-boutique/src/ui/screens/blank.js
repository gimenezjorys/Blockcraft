// Fort Boutique — écran vide provisoire (M0) : remplacé par l'intérieur de la boutique en M1+.
import { h } from '../widgets.js';

export default {
  mount() {
    return { el: h('div.blank-screen') };
  },
};
