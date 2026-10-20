// Fort Boutique — playtests simulés (D3) : jsdom + vrais événements tactiles + lecture de l'état.
// Usage : npm run playtest -- P1   (écrit docs/playtests/P1.measures.md et .json)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../tests/helpers/dom.js';
import { TouchBot } from '../tests/helpers/bot.js';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const which = (process.argv[2] || 'P1').toUpperCase();

/** Jalons de G19 (secondes depuis le premier tap) et leurs cibles. */
const MILESTONES = [
  { id: 'firstPurchase', label: 'Premier achat (P1)', target: 45, test: (s, p) => s.padsDone.length >= 1 && p.padsDone.length < 1 },
  { id: 'secondPurchase', label: 'Deuxième achat (P2)', target: 75, test: (s, p) => s.padsDone.length >= 2 && p.padsDone.length < 2 },
  { id: 'firstNight', label: 'Première nuit', target: 105, test: (s, p) => s.phase === 'night' && p.phase !== 'night' && s.save.nights === 0 },
  { id: 'firstDawn', label: 'Première aube', target: 145, test: (s, p) => s.phase === 'dawn' && p.phase !== 'dawn' && s.save.nights === 1 },
  { id: 'firstChest', label: 'Premier coffre ouvert', target: 165, test: (s, p) => s.save.chestsOpened >= 1 && p.save.chestsOpened < 1 },
  { id: 'firstUpgrade', label: 'Première amélioration', target: 190, test: (s, p) => s.save.upgrades >= 1 && p.save.upgrades < 1 },
  { id: 'level2', label: 'Niveau 2', target: 177, test: (s, p) => s.save.level >= 2 && p.save.level < 2 },
  { id: 'firstMorning', label: 'Premier Matin', target: 182, test: (s, p) => s.phase === 'morning' && p.phase !== 'morning' && s.save.cycles === 1 },
  { id: 'day2', label: 'Jour 2', target: 195, test: (s, p) => s.phase === 'day' && p.phase !== 'day' && s.save.day === 2 },
  { id: 'thirdPurchase', label: 'Troisième achat (P3, Frigo)', target: 220, test: (s, p) => s.padsDone.length >= 3 && p.padsDone.length < 3 },
  { id: 'secondNight', label: 'Deuxième nuit', target: 325, test: (s, p) => s.phase === 'night' && p.phase !== 'night' && s.save.nights === 1 },
  { id: 'level3', label: 'Niveau 3', target: 390, test: (s, p) => s.save.level >= 3 && p.save.level < 3 },
  { id: 'secondMorning', label: 'Deuxième Matin', target: 410, test: (s, p) => s.phase === 'morning' && p.phase !== 'morning' && s.save.cycles === 2 },
];

const fmtT = (sec) => (sec == null ? '—' : `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`);

/**
 * Audit du hub au premier Matin : chaque bouton doit répondre (écran, message ou secousse « non »).
 * @returns {{ id: string, response: string }[]}
 */
function auditHub(g, bot) {
  const out = [];
  // Le hub est redessiné au retour d'un écran : on relit chaque bouton par son sélecteur.
  const sels = [...g.$$('.hub-grid .tag').map((b) => `#${b.id}`), '.hub-map'];
  for (const sel of sels) {
    const el = g.$(sel);
    if (!el) continue;
    const toasts0 = (g.hooks.getState().toasts || []).length;
    el.classList.remove('nope');
    bot.tapEl(el);
    g.hooks.advance(80);
    const st = g.hooks.getState();
    let response = 'aucune';
    if (st.screen !== 'morning') response = `écran ${st.screen}`;
    else if ((st.toasts || []).length > toasts0) response = 'message';
    else if (el.classList.contains('nope')) response = 'secousse';
    out.push({ id: el.id || sel, response });
    if (st.screen !== 'morning') {
      const back = g.$('.panel-back');
      if (back) bot.tapEl(back);
      g.hooks.advance(300);
    }
    g.hooks.advance(800);
  }
  return out;
}

/** Même partie, mais le joueur ne fait rien la nuit : la nuit doit pouvoir se perdre (Hugo, P1). */
function runPassiveNights() {
  const g = loadGame();
  const bot = new TouchBot(g, { passiveNight: true });
  const stars = [];
  let prev = null;
  for (let ms = 0; ms < 12 * 60 * 1000; ms += 100) {
    bot.tick(100);
    const st = g.hooks.getState();
    const s = st.scene;
    if (s && prev && s.phase === 'dawn' && prev.phase !== 'dawn' && s.night && s.night.result) stars.push({ stars: s.night.result.stars, kept: s.night.result.kept });
    if (s) prev = s;
    if (s && s.save.cycles >= 2 && st.screen === 'morning') break;
  }
  g.close();
  return stars;
}

function runP1() {
  let hub = null;
  const g = loadGame();
  const bot = new TouchBot(g, {
    onMorning(b) {
      if (hub) return true;
      hub = auditHub(g, b);
      return false;
    },
  });
  const reached = {};
  const screens = [];
  let prev = null;
  let screenStart = 0;
  let curScreen = '';
  let exitSeenAt = null;
  let inertTaps = 0;
  let adOffers = 0;
  let oneStarRun = 0;
  let worstOneStarRun = 0;
  const nightStars = [];
  // Taps hors de toute zone interactive (signe de confusion).
  g.document.addEventListener('touchend', (e) => {
    const t = e.target;
    const interactive = t.closest && (t.closest('button') || t.closest('#game') || t.closest('.screen-title') || t.closest('.ticket'));
    if (!interactive) inertTaps++;
  }, true);
  const maxMs = 12 * 60 * 1000;
  for (let ms = 0; ms < maxMs; ms += 100) {
    bot.tick(100);
    const st = g.hooks.getState();
    const s = st.scene;
    const sec = bot.t / 1000;
    if (st.screen !== curScreen) {
      if (curScreen) screens.push({ screen: curScreen, from: screenStart, to: sec, exitAfter: exitSeenAt == null ? null : exitSeenAt - screenStart });
      curScreen = st.screen;
      screenStart = sec;
      exitSeenAt = null;
    }
    if (exitSeenAt == null) {
      const exits = ['#dawn-continue', '#hub-open', '#pause-resume'].map((q) => g.$(q)).filter((el) => el && !el.closest('[hidden]'));
      if (exits.length || st.screen === 'hud') exitSeenAt = sec;
    }
    const dbl = g.$('#dawn-double');
    if (dbl && !dbl.hidden && !dbl.dataset.counted) {
      dbl.dataset.counted = '1';
      adOffers++;
    }
    if (s && prev) {
      for (const m of MILESTONES) if (reached[m.id] === undefined && m.test(s, prev)) reached[m.id] = sec;
      if (s.phase === 'dawn' && prev.phase !== 'dawn' && s.night && s.night.result) {
        const stars = s.night.result.stars;
        nightStars.push(stars);
        oneStarRun = stars <= 1 ? oneStarRun + 1 : 0;
        worstOneStarRun = Math.max(worstOneStarRun, oneStarRun);
      }
    }
    if (s) prev = s;
    if (s && s.save.cycles >= 2 && st.screen === 'morning') break;
  }
  if (curScreen) screens.push({ screen: curScreen, from: screenStart, to: bot.t / 1000, exitAfter: exitSeenAt == null ? null : exitSeenAt - screenStart });
  const final = g.hooks.getState().scene;
  const out = {
    playtest: 'P1',
    durationS: bot.t / 1000,
    milestones: MILESTONES.map((m) => {
      const at = reached[m.id] ?? null;
      return { id: m.id, label: m.label, targetS: m.target, atS: at, gapPct: at == null ? null : Math.round(((at - m.target) / m.target) * 100), ok: at != null && at >= m.target * 0.8 && at <= m.target * 1.2 };
    }),
    hub,
    passiveNights: runPassiveNights(),
    screens,
    taps: bot.taps,
    inertTaps,
    adOffersFirst10min: adOffers,
    nightStars,
    worstOneStarRun,
    errors: g.errors.slice(),
    final: final ? { level: final.save.level, xp: final.save.xp, coins: final.coins, pads: final.padsDone, furniture: final.save.furniture } : null,
  };
  g.close();
  return out;
}

function toMarkdown(r) {
  const lines = [];
  lines.push(`## Mesures automatiques (${r.playtest})`, '');
  lines.push(`Durée simulée : ${fmtT(r.durationS)} — taps : ${r.taps} — taps inertes : ${r.inertTaps} — erreurs JavaScript : ${r.errors.length}`, '');
  lines.push('| Jalon (G19) | Cible | Atteint | Écart | Dans la fenêtre (±20 %) |', '|---|---|---|---|---|');
  for (const m of r.milestones) lines.push(`| ${m.label} | ${fmtT(m.targetS)} | ${fmtT(m.atS)} | ${m.gapPct == null ? '—' : `${m.gapPct > 0 ? '+' : ''}${m.gapPct} %`} | ${m.ok ? 'oui' : 'NON'} |`);
  lines.push('', 'Le robot tape tout de suite à l’aube et au Matin : il est en avance sur un vrai joueur. Les écarts négatifs se lisent donc comme une borne basse.');
  lines.push('', '| Écran | De | À | Sortie visible après |', '|---|---|---|---|');
  for (const s of r.screens) lines.push(`| ${s.screen} | ${fmtT(s.from)} | ${fmtT(s.to)} | ${s.exitAfter == null ? '—' : `${s.exitAfter.toFixed(1)} s`} |`);
  lines.push('', `Étoiles par nuit : ${r.nightStars.join(', ') || '—'} — plus longue série de nuits à ★ : ${r.worstOneStarRun}`);
  lines.push(`Propositions de pub pendant les 10 premières minutes : ${r.adOffersFirst10min} (visibilité lue sur l’attribut hidden ; la règle CSS \`[hidden]\` l’emporte toujours, test tests/unit/ui-rules.test.js, et scripts/screens.mjs le vérifie dans Chromium)`);
  if (r.hub) lines.push(`Boutons du hub au premier Matin : ${r.hub.map((b) => `${b.id} → ${b.response}`).join(' ; ')} — muets : ${r.hub.filter((b) => b.response === 'aucune').length}`);
  if (r.passiveNights) lines.push(`Joueur passif la nuit (ne bouge pas, pas de Cloche) : ${r.passiveNights.map((n) => `${n.stars}★ (${Math.round(n.kept * 100)} %)`).join(', ')}`);
  if (r.final) lines.push(`État final : niveau ${r.final.level} (${r.final.xp} XP), ${r.final.coins} pièces, emplacements ${r.final.pads.join(', ')}`);
  return lines.join('\n') + '\n';
}

const runners = { P1: runP1 };
if (!runners[which]) {
  process.stderr.write(`playtest inconnu : ${which} (disponibles : ${Object.keys(runners).join(', ')})\n`);
  process.exit(1);
}
const result = runners[which]();
mkdirSync(join(ROOT, 'docs/playtests'), { recursive: true });
writeFileSync(join(ROOT, `docs/playtests/${which}.measures.json`), JSON.stringify(result, null, 2) + '\n');
writeFileSync(join(ROOT, `docs/playtests/${which}.measures.md`), toMarkdown(result));
process.stdout.write(toMarkdown(result));
process.exit(result.errors.length ? 1 : 0);
