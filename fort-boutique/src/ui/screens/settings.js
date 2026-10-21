// Fort Boutique — Paramètres (rouage du Matin et pause) : volumes, confort, langue, sauvegarde (export / import FB1,
// réinitialisation en deux temps), version. La logique (code FB1, remise en état) est dans src/save/export.js.
import { h, onTap, tagButton } from '../widgets.js';
import { t, fmt } from '../i18n.js';
import { SVG } from '../icons.js';
import { exportCode, importCode, summarizeSave } from '../../save/export.js';

/** Interrupteurs (clé de save.settings → libellé). */
const TOGGLES = [
  ['vibration', 'settings.vibration'],
  ['shake', 'settings.shake'],
  ['reducedFlash', 'settings.reducedFlash'],
  ['leftHanded', 'settings.leftHanded'],
  ['bigText', 'settings.bigText'],
  ['economy', 'settings.economy'],
];

/** Temps pour confirmer la réinitialisation (2e tap), en secondes. */
const RESET_CONFIRM_S = 5;

/**
 * @param {any} app
 * @param {{ save: any, version: { version: string, hash: string, date: string }, onChange: () => void,
 *   onLang: (lang: string) => void, onReplace: (data: any) => void, onReset: () => void, onClose: () => void,
 *   importCtx: { seed: number, now: number, lang?: string } }} p
 */
function mount(app, p, d) {
  const s = p.save.settings;
  const sfx = (id) => app.services.audio && app.services.audio.play(id);
  const back = h('button.panel-back', { type: 'button', 'aria-label': t('common.back'), html: SVG.back, id: 'settings-close' });
  onTap(back, () => p.onClose(), d);
  const head = h('div.panel-head', [back, h('h2.sticker.panel-title', { text: t('settings.title') })]);

  // Volumes (0 à 100).
  const slider = (key, label) => {
    const input = h('input.set-range', { type: 'range', min: '0', max: '100', step: '5', id: `set-${key}`, 'aria-label': t(label) });
    input.value = String(Math.round((s[key] ?? 0.8) * 100));
    d.listen(input, 'input', () => {
      s[key] = Math.max(0, Math.min(1, Number(input.value) / 100));
      p.onChange();
    });
    d.listen(input, 'change', () => sfx('ui_tap'));
    return h('label.set-row', [h('span.set-label', { text: t(label) }), input]);
  };

  // Interrupteurs : étiquette verte « oui » / kraft « non ».
  const toggles = TOGGLES.map(([key, label]) => {
    const b = tagButton({ label: '', small: true, id: `set-${key}` });
    const paint = () => {
      b.dataset.variant = s[key] ? 'green' : 'kraft';
      b.setAttribute('aria-pressed', s[key] ? 'true' : 'false');
      b.querySelector('.tag-label').textContent = s[key] ? t('settings.on') : t('settings.off');
    };
    paint();
    onTap(b, () => {
      s[key] = !s[key];
      paint();
      sfx('ui_tap');
      p.onChange();
    }, d);
    return h('div.set-row', [h('span.set-label', { text: t(label) }), b]);
  });

  // Langue.
  const langs = h('div.set-langs', ['fr', 'en'].map((lang) => {
    const b = tagButton({ label: lang.toUpperCase(), small: true, variant: s.lang === lang ? 'green' : 'kraft', id: `set-lang-${lang}` });
    onTap(b, () => {
      if (s.lang === lang) return;
      s.lang = lang;
      sfx('ui_tap');
      p.onLang(lang);
    }, d);
    return b;
  }));

  // Sauvegarde : exporter (code FB1 à copier), importer (vérification, comparaison, confirmation), réinitialiser.
  const box = h('div.set-box');
  const msg = h('div.set-msg', { 'aria-live': 'polite' });
  const say = (text, bad = false) => {
    msg.textContent = text;
    msg.classList.toggle('bad', bad);
  };
  const exportBtn = tagButton({ label: t('settings.export'), small: true, id: 'set-export' });
  const importBtn = tagButton({ label: t('settings.import'), small: true, id: 'set-import' });
  onTap(exportBtn, () => {
    box.innerHTML = '';
    say('');
    const area = h('textarea.set-code', { readonly: 'readonly', id: 'set-code', rows: '3', 'aria-label': t('settings.export') });
    area.value = exportCode(p.save);
    const copy = tagButton({ label: t('settings.copy'), small: true, variant: 'green', id: 'set-copy' });
    onTap(copy, () => {
      area.select();
      const done = () => say(t('settings.copied'));
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(area.value).then(done, done);
        else done();
      } catch {
        done();
      }
    }, d);
    box.append(area, copy);
  }, d);
  onTap(importBtn, () => {
    box.innerHTML = '';
    say('');
    const area = h('textarea.set-code', { id: 'set-import-code', rows: '3', placeholder: 'FB1-…', 'aria-label': t('settings.import') });
    const check = tagButton({ label: t('settings.check'), small: true, variant: 'green', id: 'set-check' });
    onTap(check, () => {
      const r = importCode(area.value, p.importCtx);
      if (!r.ok) {
        say(t('settings.importBad'), true);
        sfx('error');
        return;
      }
      // Comparaison avant de remplacer (B9) : niveau, quartiers, pièces.
      const a = summarizeSave(p.save);
      const b = summarizeSave(r.data);
      const line = (k, x, y) => h('div.set-cmp-row', [h('span', { text: t(k) }), h('span', { text: fmt(x) }), h('span', { text: fmt(y) })]);
      const cmp = h('div.set-cmp', [
        h('div.set-cmp-row.head', [h('span'), h('span', { text: t('settings.current') }), h('span', { text: t('settings.imported') })]),
        line('settings.level', a.level, b.level),
        line('settings.districts', a.districts, b.districts),
        line('settings.coins', a.coins, b.coins),
      ]);
      const replace = tagButton({ label: t('settings.replace'), small: true, variant: 'coral', id: 'set-replace' });
      onTap(replace, () => p.onReplace(r.data), d);
      box.append(cmp, replace);
      say(t('settings.importOk'));
    }, d);
    box.append(area, check);
  }, d);

  const reset = tagButton({ label: t('settings.reset'), small: true, variant: 'coral', id: 'set-reset' });
  let armedT = 0;
  onTap(reset, () => {
    if (armedT > 0) {
      p.onReset();
      return;
    }
    armedT = RESET_CONFIRM_S;
    reset.querySelector('.tag-label').textContent = t('settings.resetConfirm');
    sfx('error');
  }, d);

  const v = p.version || {};
  const version = h('div.set-version', { text: `v${v.version || '?'} · ${v.hash || '-'} · ${v.date || ''}` });
  const body = h('div.set-body', [
    h('h3.set-h', { text: t('settings.sound') }),
    slider('music', 'settings.music'),
    slider('sfx', 'settings.sfx'),
    h('h3.set-h', { text: t('settings.comfort') }),
    ...toggles,
    h('h3.set-h', { text: t('settings.lang') }),
    langs,
    h('h3.set-h', { text: t('settings.save') }),
    h('div.set-actions', [exportBtn, importBtn]),
    box,
    msg,
    h('div.set-actions', [reset]),
    version,
  ]);
  const el = h('div.panel.slate-full.settings', [head, body]);
  return {
    el,
    update(dt) {
      if (armedT <= 0) return;
      armedT -= dt;
      if (armedT <= 0) reset.querySelector('.tag-label').textContent = t('settings.reset');
    },
    onKey(key) {
      if (key === 'Escape') {
        p.onClose();
        return true;
      }
      return true;
    },
  };
}

export default { mount, overlay: true };
