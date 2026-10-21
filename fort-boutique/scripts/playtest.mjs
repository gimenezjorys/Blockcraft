// Fort Boutique — playtests simulés (D3) : jsdom + vrais événements tactiles + lecture de l'état.
// Usage : npm run playtest -- P1   (écrit docs/playtests/P1.measures.md et .json)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../tests/helpers/dom.js';
import { TouchBot } from '../tests/helpers/bot.js';
import { HumanBot } from './lib/human-bot.mjs';

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

const fmtT = (sec) => {
  if (sec == null) return '—';
  const r = Math.round(sec);
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
};

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

/**
 * Jalons de G19 pour P2, aux temps du tableau (secondes depuis le premier tap). Les niveaux se mesurent quand le joueur
 * les voit : au ruban de l'aube (ou à la bannière s'ils arrivent pendant le jour).
 */
const P2_MILESTONES = [
  { id: 'day1', key: true, label: 'Jour 1 (après l’enveloppe)', target: 6, test: (s, p) => s.phase === 'day' && p.phase !== 'day' && s.save.day === 1 },
  { id: 'firstPurchase', key: true, label: 'Premier achat (P1)', target: 40, test: (s) => s.padsDone.length >= 1 },
  { id: 'secondPurchase', key: true, label: 'Deuxième achat (P2)', target: 75, test: (s) => s.padsDone.length >= 2 },
  { id: 'firstDusk', key: true, label: 'Crépuscule 1', target: 102, test: (s, p) => s.phase === 'dusk' && p.phase !== 'dusk' && s.save.day === 1 },
  { id: 'firstNight', key: true, label: 'Nuit 1', target: 106, test: (s, p) => s.phase === 'night' && p.phase !== 'night' && s.save.nights === 0 },
  { id: 'firstDawn', key: true, label: 'Aube 1 (écran du ticket)', target: 145, screen: 'dawn', test: (s) => s.save.nights >= 1 },
  { id: 'firstChest', key: true, label: 'Premier coffre ouvert', target: 162, test: (s) => s.save.chestsOpened >= 1 },
  { id: 'firstUpgrade', key: true, label: 'Première amélioration', target: 170, test: (s) => s.save.upgrades >= 1 },
  { id: 'level2', label: 'Niveau 2 (ruban)', target: 177, level: 2 },
  { id: 'firstMorning', key: true, label: 'Premier Matin', target: 182, screen: 'morning', test: (s) => s.save.cycles >= 1 },
  { id: 'day2', key: true, label: 'Jour 2', target: 195, test: (s, p) => s.phase === 'day' && p.phase !== 'day' && s.save.day === 2 },
  { id: 'thirdPurchase', label: 'Troisième achat (P3, Frigo)', target: 220, test: (s) => s.padsDone.length >= 3 },
  { id: 'rush', label: 'Premier Rush', target: 250, test: (s) => s.rush },
  { id: 'fourthPurchase', label: 'Quatrième achat (P4)', target: 280, test: (s) => s.padsDone.length >= 4 },
  { id: 'secondNight', key: true, label: 'Nuit 2', target: 325, test: (s, p) => s.phase === 'night' && p.phase !== 'night' && s.save.nights === 1 },
  { id: 'secondDawn', label: 'Aube 2', target: 390, screen: 'dawn', test: (s) => s.save.nights >= 2 },
  { id: 'level3', key: true, label: 'Niveau 3 (ruban)', target: 390, level: 3 },
  { id: 'secondMorning', label: 'Deuxième Matin', target: 410, screen: 'morning', test: (s) => s.save.cycles >= 2 },
  { id: 'firstEdit', label: 'Premier aménagement validé', target: 455, event: 'edit_validate' },
  { id: 'day3', key: true, label: 'Jour 3', target: 460, test: (s, p) => s.phase === 'day' && p.phase !== 'day' && s.save.day === 3 },
  { id: 'firstOrder', key: true, label: 'Première Commande spéciale (jour 3, 20 à 45 % de la journée : ≈ 8:40)', target: 520, test: (s) => !!s.order },
  { id: 'newEntrance', key: true, label: 'Fermeture du jour 3 : nouvelle entrée annoncée', target: 610, test: (s) => s.newEntrance && s.newEntrance.length > 0 && s.save.day === 3 },
];

/** Un objectif (ou une action à faire) est-il visible ? Étiquette au Matin et au Jour, vagues la nuit, bouton ailleurs. */
function objectiveVisible(g, st) {
  const sc = st.scene;
  const visible = (sel) => {
    const el = g.$(sel);
    return !!el && !el.closest('[hidden]');
  };
  switch (st.screen) {
    case 'hud':
      if (sc && (sc.phase === 'day' || sc.phase === 'closing')) return visible('#objective');
      return !!sc && sc.phase === 'night';
    case 'morning':
      return visible('#objective');
    case 'dawn':
      return visible('.dawn-chest') || g.$$('.card-up').some((b) => !b.hidden) || visible('.dawn-actions');
    case 'unlocks':
      return visible('#unlock-ok');
    case 'editor':
      return visible('#ed-validate');
    case 'intro': {
      const env = g.$('.intro-envelope');
      return !!env && env.classList.contains('landed');
    }
    default:
      return false;
  }
}

function runP2() {
  const g = loadGame();
  const events = [];
  const bot = new HumanBot(g, { onEvent: (e) => events.push(e) });
  const reached = {};
  const screens = [];
  let prev = null;
  let curScreen = '';
  let screenStart = 0;
  let inertTaps = 0;
  let adOffers = 0;
  let gapStart = null;
  let worstGap = { s: 0, at: 0, screen: '' };
  let hintsShown = 0;
  let hintS = 0;
  let wasHint = false;
  const nightStars = [];
  const seen = { vip: false, hurried: false, order: false, rush: false };
  let summary10 = null;
  g.document.addEventListener('touchend', (e) => {
    const t = e.target;
    const interactive = t.closest && (t.closest('button') || t.closest('#game') || t.closest('.screen-title') || t.closest('.ticket') || t.closest('.intro'));
    if (!interactive) inertTaps++;
  }, true);
  const maxMs = 11 * 60 * 1000;
  let started = null;
  for (let ms = 0; ms < maxMs; ms += 100) {
    bot.tick(100);
    const st = g.hooks.getState();
    // Dans l'éditeur, la scène est celle de l'éditeur (pas de partie) : on garde le dernier état de la partie.
    const s = st.scene && st.scene.save ? st.scene : null;
    // Le chrono part du premier tap (écran titre), comme G19 (0:00).
    if (started == null && st.screen !== 'title') started = bot.t / 1000 - 0.1;
    if (started == null) continue;
    const sec = bot.t / 1000 - started;
    if (st.screen !== curScreen) {
      if (curScreen) screens.push({ screen: curScreen, from: screenStart, to: sec });
      curScreen = st.screen;
      screenStart = sec;
    }
    // Plus longue période sans objectif visible.
    if (objectiveVisible(g, st)) {
      if (gapStart != null && sec - gapStart > worstGap.s) worstGap = { s: sec - gapStart, at: gapStart, screen: curScreen };
      gapStart = null;
    } else if (gapStart == null) gapStart = sec;
    const dbl = g.$('#dawn-double');
    if (dbl && !dbl.hidden && !dbl.dataset.counted) {
      dbl.dataset.counted = '1';
      adOffers++;
    }
    if (s && s.hints) {
      if (s.hints.shown && !wasHint) hintsShown++;
      if (s.hints.shown) hintS += 0.1;
      wasHint = !!s.hints.shown;
    }
    if (s && s.rush) seen.rush = true;
    if (s && s.order) seen.order = true;
    if (s && prev) {
      for (const m of P2_MILESTONES) {
        if (reached[m.id] !== undefined) continue;
        if (m.level) {
          const ribbon = g.$('.dawn-level');
          // À l'aube, le niveau se voit au ruban (la pluie de pièces et le ticket passent d'abord).
          const atDawn = st.screen === 'dawn' || s.phase === 'dawn';
          if (s.save.level >= m.level && (!atDawn || (ribbon && !ribbon.hidden && Number(ribbon.dataset.level) >= m.level))) reached[m.id] = sec;
          continue;
        }
        if (m.event) {
          const e = events.find((x) => x.type === m.event);
          if (e) reached[m.id] = e.at / 1000 - started;
          continue;
        }
        if (m.screen && st.screen !== m.screen) continue;
        if (m.test(s, prev)) reached[m.id] = sec;
      }
      if (s.phase === 'dawn' && prev.phase !== 'dawn' && s.night && s.night.result) nightStars.push(s.night.result.stars);
    }
    if (s) prev = s;
    if (!summary10 && sec >= 600 && s) {
      summary10 = {
        day: s.save.day, nights: s.save.nights, nightStars: nightStars.slice(), pads: s.padsDone.length,
        upgrades: s.save.upgrades, level: s.save.level, edits: events.filter((e) => e.type === 'edit_validate').length,
      };
    }
    // Jusqu'à 10:00 au moins, et jusqu'au début de la nuit 3 (G19 s'arrête à 10:10).
    if (s && sec >= 600 && s.phase === 'night' && s.save.nights >= 2) break;
  }
  if (curScreen) screens.push({ screen: curScreen, from: screenStart, to: bot.t / 1000 - (started || 0) });
  // Raisons de revenir visibles au dernier Matin (lune, quêtes et Défi du jour au niveau 4, calendrier).
  const final = g.hooks.getState().scene;
  const out = {
    playtest: 'P2',
    durationS: bot.t / 1000 - (started || 0),
    milestones: P2_MILESTONES.map((m) => {
      const at = reached[m.id] ?? null;
      return { id: m.id, key: !!m.key, label: m.label, targetS: m.target, atS: at, gapPct: at == null ? null : Math.round(((at - m.target) / m.target) * 100), ok: at != null && at >= m.target * 0.8 && at <= m.target * 1.2 };
    }),
    worstGapWithoutObjective: worstGap,
    hintsShown,
    hintSeconds: Math.round(hintS),
    screens,
    taps: bot.taps,
    inertTaps,
    adOffersFirst10min: adOffers,
    nightStars,
    seen,
    summary10,
    errors: g.errors.slice(),
    final: final ? { level: final.save.level, xp: final.save.xp, coins: final.coins, pads: final.padsDone, day: final.save.day } : null,
  };
  g.close();
  return out;
}

/** Même début de partie, joueur hésitant : il attend 8 s, s'arrête après la première prise, ignore le voleur. */
function runP2Hesitant() {
  const g = loadGame();
  const bot = new HumanBot(g, { hesitant: true });
  const seen = [];
  let first = null;
  let prevKey = '';
  const nightStars = [];
  let prev = null;
  let started = null;
  for (let ms = 0; ms < 8 * 60 * 1000; ms += 100) {
    bot.tick(100);
    const st = g.hooks.getState();
    const s = st.scene && st.scene.save ? st.scene : null;
    if (started == null && st.screen !== 'title') started = bot.t / 1000 - 0.1;
    if (started == null || !s) continue;
    const sec = bot.t / 1000 - started;
    const h = s.hints;
    const key = h ? `${s.phase}:${h.hand ? 'main' : ''}${h.arrow ? `+flèche ${h.arrow === 'red' ? 'rouge' : 'dorée'}` : ''}${h.halo ? '+halo' : ''}` : '';
    if (h && (h.hand || h.arrow) && key !== prevKey) seen.push({ at: sec, what: key, day: s.save.day });
    prevKey = key;
    if (first == null && s.padsDone.length >= 1) first = sec;
    if (prev && s.phase === 'dawn' && prev.phase !== 'dawn' && s.night && s.night.result) nightStars.push(s.night.result.stars);
    prev = s;
    if (s.save.day === 2 && s.phase === 'dusk') break;
  }
  const out = { seen, firstPurchaseS: first, nightStars, errors: g.errors.slice() };
  g.close();
  return out;
}

function toMarkdownP2(r) {
  const lines = [];
  lines.push('## Mesures automatiques (P2)', '');
  lines.push(`Durée simulée : ${fmtT(r.durationS)} — taps : ${r.taps} — taps inertes : ${r.inertTaps} — erreurs JavaScript : ${r.errors.length}`, '');
  lines.push('Robot « au rythme humain » (`scripts/lib/human-bot.mjs`) : il lit le ticket, regarde les cartes, attend avant de taper', '(temps fixes, donc mesure reproductible), contourne les meubles et suit la main fantôme dans l’éditeur.', '');
  lines.push('Jalons en **gras** : ceux que G19 met en gras (moments clés). Les autres lignes du tableau de G19 sont des repères.', '');
  lines.push('| Jalon (G19) | Cible | Atteint | Écart | Dans la fenêtre (±20 %) |', '|---|---|---|---|---|');
  for (const m of r.milestones) {
    const label = m.key ? `**${m.label}**` : m.label;
    lines.push(`| ${label} | ${fmtT(m.targetS)} | ${fmtT(m.atS)} | ${m.gapPct == null ? '—' : `${m.gapPct > 0 ? '+' : ''}${m.gapPct} %`} | ${m.ok ? 'oui' : 'NON'} |`);
  }
  const keys = r.milestones.filter((m) => m.key);
  lines.push('', `Jalons en gras dans leur fenêtre : ${keys.filter((m) => m.ok).length}/${keys.length} — repères : ${r.milestones.filter((m) => !m.key && m.ok).length}/${r.milestones.filter((m) => !m.key).length}`);
  const w = r.worstGapWithoutObjective;
  lines.push('', `Plus longue période sans objectif visible : ${w.s.toFixed(1)} s (à ${fmtT(w.at)}, écran ${w.screen || '—'}) — seuil 20 s : ${w.s <= 20 ? 'tenu' : 'DÉPASSÉ'}`);
  lines.push(`Indices montrés (main, halo, traînée) : ${r.hintsShown} fois, ${r.hintSeconds} s au total`);
  lines.push(`Étoiles par nuit : ${r.nightStars.join(', ') || '—'} — Rush vu : ${r.seen.rush ? 'oui' : 'non'} — Commande spéciale vue : ${r.seen.order ? 'oui' : 'non'}`);
  lines.push(`Propositions de pub pendant les 10 premières minutes : ${r.adOffersFirst10min}`);
  if (r.summary10) {
    const b = r.summary10;
    lines.push(`Bilan à 10:00 : jour ${b.day}, ${b.nights} nuits (${b.nightStars.join(', ')}★), ${b.pads} achats d’emplacements, ${b.upgrades} amélioration(s), niveau ${b.level}, ${b.edits} aménagement(s)`);
  }
  if (r.hesitant) {
    const hz = r.hesitant;
    lines.push('', '### Joueur hésitant (attend 8 s au début, s’arrête 6 s après la première prise, ignore le voleur de la nuit 1)', '');
    lines.push(`Premier achat : ${fmtT(hz.firstPurchaseS)} — étoiles : ${hz.nightStars.join(', ') || '—'} — erreurs : ${hz.errors.length}`, '');
    lines.push('| Moment | Jour | Aide affichée |', '|---|---|---|');
    for (const x of hz.seen.slice(0, 40)) lines.push(`| ${fmtT(x.at)} | ${x.day} | ${x.what} |`);
  }
  lines.push('', '| Écran | De | À |', '|---|---|---|');
  for (const s of r.screens) lines.push(`| ${s.screen} | ${fmtT(s.from)} | ${fmtT(s.to)} |`);
  if (r.final) lines.push('', `État final : jour ${r.final.day}, niveau ${r.final.level} (${r.final.xp} XP), ${r.final.coins} pièces, emplacements ${r.final.pads.join(', ')}`);
  return lines.join('\n') + '\n';
}

const runners = { P1: runP1, P2: () => ({ ...runP2(), hesitant: runP2Hesitant() }) };
if (!runners[which]) {
  process.stderr.write(`playtest inconnu : ${which} (disponibles : ${Object.keys(runners).join(', ')})\n`);
  process.exit(1);
}
const result = runners[which]();
const md = which === 'P2' ? toMarkdownP2(result) : toMarkdown(result);
mkdirSync(join(ROOT, 'docs/playtests'), { recursive: true });
writeFileSync(join(ROOT, `docs/playtests/${which}.measures.json`), JSON.stringify(result, null, 2) + '\n');
writeFileSync(join(ROOT, `docs/playtests/${which}.measures.md`), md);
process.stdout.write(md);
process.exit(result.errors.length || (result.hesitant && result.hesitant.errors.length) ? 1 : 0);
