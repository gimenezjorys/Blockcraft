// Fort Boutique — éditeur d'aménagement, interface DOM (G6.5) : interrupteurs des trajets (longueur + flèche),
// Réserve en bas, Tourner / Ranger, Conseil de Mamie, Annuler (corail) / Valider (vert).
import { h, onTap, tagButton } from '../widgets.js';
import { t } from '../i18n.js';
import { SVG, furnitureIcon } from '../icons.js';
import { editorLengths, rotateItem, storeItem, mamieAdvice } from '../../game/editor.js';
import { clientToLogical } from '../../render/camera.js';

/**
 * @param {any} app
 * @param {{ scene: any, ed: any, showAdvice: boolean, hintFirst: boolean, onValidate: () => void, onCancel: () => void }} p
 */
function mount(app, p, d) {
  const { scene, ed } = p;
  const sfx = (id) => app.services.audio && app.services.audio.play(id);
  const custBtn = tagButton({ label: '', small: true, variant: 'kraft', id: 'ed-customers' });
  const monBtn = tagButton({ label: '', small: true, variant: 'kraft', id: 'ed-monsters' });
  custBtn.classList.add('path-toggle', 'on', 'path-customers');
  monBtn.classList.add('path-toggle', 'on', 'path-monsters');
  const top = h('div.ed-top', [custBtn, monBtn]);
  // Outils en icônes (G6.5 : Tourner ⟳, Ranger ⬇, ampoule du Conseil de Mamie) ; le nom reste lisible par les lecteurs d'écran.
  const iconTool = (id, svg, label, variant = 'kraft') => {
    const b = tagButton({ label: '', small: true, variant, icon: svg, id });
    b.classList.add('icon-only');
    b.setAttribute('aria-label', label);
    return b;
  };
  const rotate = iconTool('ed-rotate', SVG.rotate, t('editor.rotate'));
  const store = iconTool('ed-store', SVG.store, t('editor.store'));
  const advice = iconTool('ed-advice', SVG.bulb, t('editor.advice'), 'gold');
  advice.hidden = !p.showAdvice;
  const tools = h('div.ed-tools', [rotate, store, advice]);
  const reserve = h('div.ed-reserve');
  const cancel = tagButton({ label: t('editor.cancel'), variant: 'coral', small: true, id: 'ed-cancel' });
  const validate = tagButton({ label: t('editor.validate'), variant: 'green', small: true, id: 'ed-validate' });
  const bottom = h('div.ed-bottom', [reserve, h('div.ed-bar', [tools, h('div.ed-actions', [cancel, validate])])]);
  const el = h('div.editor.passthrough', [top, bottom]);
  top.classList.add('interactive');
  bottom.classList.add('interactive');

  const arrow = (dv) => (dv > 0.05 ? ' ↑' : dv < -0.05 ? ' ↓' : '');
  function refresh() {
    const L = editorLengths(ed);
    custBtn.querySelector('.tag-label').textContent = `${t('editor.customers')} ${L.customers.toFixed(1)}${arrow(L.customersDelta)}`;
    monBtn.querySelector('.tag-label').textContent = `${t('editor.monsters')} ${L.monsters.toFixed(1)}${arrow(L.monstersDelta)}`;
    const sel = ed.selected >= 0 ? ed.layout[ed.selected] : null;
    rotate.classList.toggle('disabled', !sel);
    store.classList.toggle('disabled', !sel || sel.id === 'caisse');
    reserve.innerHTML = '';
    ed.storage.forEach((id, i) => {
      const b = h('button.ed-res-item', { type: 'button', 'data-storage': i, 'data-furniture': id }, [furnitureIcon(id, 40)]);
      bindReserveDrag(b, i);
      reserve.appendChild(b);
    });
    if (!ed.storage.length) reserve.appendChild(h('span.ed-res-empty', { text: t('editor.reserveEmpty') }));
  }

  function bindReserveDrag(btn, i) {
    const pt = { x: 0, y: 0 };
    const logical = (cx, cy) => clientToLogical(app.viewport(), cx, cy, pt);
    let active = false;
    const start = (cx, cy) => {
      active = true;
      const q = logical(cx, cy);
      scene.beginPlace(i, q.x, q.y);
    };
    const move = (cx, cy) => {
      if (!active) return;
      const q = logical(cx, cy);
      scene.onPointer('move', q.x, q.y);
    };
    const end = (cx, cy) => {
      if (!active) return;
      active = false;
      const q = logical(cx, cy);
      scene.onPointer('move', q.x, q.y);
      scene.onPointer('up', q.x, q.y);
    };
    d.listen(btn, 'pointerdown', (e) => start(e.clientX, e.clientY));
    d.listen(btn, 'pointermove', (e) => move(e.clientX, e.clientY));
    d.listen(btn, 'pointerup', (e) => end(e.clientX, e.clientY));
    d.listen(btn, 'touchstart', (e) => {
      if (app.input && e.changedTouches[0]) start(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: true });
    d.listen(btn, 'touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.changedTouches[0]) move(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }, { passive: false });
    d.listen(btn, 'touchend', (e) => {
      if (e.changedTouches[0]) end(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    });
  }

  onTap(custBtn, () => {
    scene.view.showCustomers = !scene.view.showCustomers;
    custBtn.classList.toggle('on', scene.view.showCustomers);
  }, d);
  onTap(monBtn, () => {
    scene.view.showMonsters = !scene.view.showMonsters;
    monBtn.classList.toggle('on', scene.view.showMonsters);
  }, d);
  onTap(rotate, () => {
    if (ed.selected < 0) return;
    const r = rotateItem(ed, ed.selected);
    sfx(r.ok ? 'ui_tap' : 'error');
    if (r.ok) scene.refreshPaths();
    refresh();
  }, d);
  onTap(store, () => {
    if (ed.selected < 0) return;
    const r = storeItem(ed, ed.selected);
    sfx(r.ok ? 'drop' : 'error');
    if (r.ok) scene.refreshPaths();
    refresh();
  }, d);
  onTap(advice, () => {
    const a = mamieAdvice(ed.districtId, ed.expansion, ed.layout);
    if (a.moves.length) {
      ed.layout = a.layout;
      ed.moves += a.moves.length;
      ed.selected = -1;
      scene.refreshPaths();
      sfx('upgrade');
    } else sfx('error');
    refresh();
  }, d);
  onTap(cancel, () => p.onCancel(), d);
  onTap(validate, () => p.onValidate(), d);

  if (p.hintFirst) {
    const a = mamieAdvice(ed.districtId, ed.expansion, ed.layout, { maxMoves: 1 });
    if (a.moves.length && a.gain >= 2 - 1e-9) scene.view.hint = a.moves[0];
  }
  scene.onChangeExternal = refresh;
  refresh();
  return {
    el,
    refresh,
    onKey(key) {
      if (key === 'Escape') {
        p.onCancel();
        return true;
      }
      if (key === 'Enter') {
        p.onValidate();
        return true;
      }
      return false;
    },
  };
}

export default { mount };
export { SVG };
