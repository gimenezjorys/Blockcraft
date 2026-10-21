// Fort Boutique — captures 360 × 640 des écrans clés (D3.4), si Playwright est disponible (jamais requis).
// Usage : NODE_PATH=$(npm root -g) node scripts/screens.mjs [dossier]   (défaut : docs/screens)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { defaultSave } from '../src/save/schema.js';
import { serialize, SAVE_KEY } from '../src/save/save.js';
import { districtDef } from '../src/data/districts.js';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const OUT = process.argv[2] || join(ROOT, 'docs/screens');
let chromium;
try {
  chromium = createRequire(import.meta.url)('playwright').chromium;
} catch {
  process.stdout.write('Playwright absent : captures ignorées (optionnel, D3.4).\n');
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'fr-FR' })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
const cheat = async (id) => {
  await page.click('.debug-toggle');
  await page.click(`[data-cheat="${id}"]`);
  await page.click('.debug-toggle');
};
await page.goto(`file://${join(ROOT, 'dist/index.html')}?debug=1`);
await page.evaluate(() => { document.querySelector('.debug-panel').style.opacity = '0'; });
await page.waitForTimeout(2600);
await shot('01-titre');
await page.touchscreen.tap(180, 320);
// M11 : la scène de l'enveloppe (G19 0:02), puis le Jour 1 avec la main fantôme, la flèche dorée et l'objectif.
await page.waitForTimeout(2300);
await shot('01b-enveloppe');
await page.tap('.intro-envelope', { force: true });
await page.waitForTimeout(3200);
await shot('01c-jour1-indices');
await page.waitForTimeout(800);
// Cagette (0,1) puis étagère (0,4) au clavier, puis la caisse.
await hold('ArrowUp', 1000);
await hold('ArrowLeft', 330);
await page.waitForTimeout(1200);
await hold('ArrowDown', 1000);
await page.waitForTimeout(900);
await hold('ArrowRight', 380);
await hold('ArrowUp', 330);
await page.waitForTimeout(5000);
await shot('02-jour');
await cheat('skip');
await page.waitForTimeout(8600);
await shot('03-crepuscule');
await page.waitForTimeout(9000);
await shot('04-nuit');
// M11 : la nuit 1 suit le rythme de G19 (≈ 34 s), puis 2,5 s de pluie de pièces avant le ticket.
await page.waitForSelector('.screen-dawn', { state: 'visible', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(4000);
await shot('05-aube');
// Vrai navigateur : la sortie et le bouton ×2 restent invisibles tant que le coffre est fermé (P1, G3.8, G18.3).
const checks = [];
const expectHidden = async (sel, why) => {
  if (await page.isVisible(sel)) checks.push(`${sel} visible : ${why}`);
};
await page.waitForSelector('.dawn-chest', { state: 'visible', timeout: 15000 }).catch(() => checks.push('coffre invisible'));
await expectHidden('#dawn-continue', 'sortie avant le coffre');
await expectHidden('#dawn-double', 'pub pendant les 10 premières minutes');
for (let i = 0; i < 3; i++) {
  await page.tap('.dawn-chest');
  await page.waitForTimeout(250);
}
await page.waitForTimeout(1500);
await shot('06-coffre');
await page.tap('#dawn-continue');
await page.waitForTimeout(800);
await shot('07-matin');
// Matin avancé (niveau 5, jour 3) : cartes de déblocage, Catalogue, Améliorer.
{
  const s = defaultSave({ seed: 7, now: 0, lang: 'fr' });
  Object.assign(s.progress, { pendingUnlocks: [5] });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  Object.assign(s.stats, { cycles: 2, nights: 2 });
  Object.assign(s.player, { level: 5, coins: 640 });
  s.furniture.etagere = { level: 1, plans: 3 };
  s.furniture.cagette = { level: 2, plans: 1 };
  const shop = s.shops.q1;
  Object.assign(shop, { day: 3, night: 3 });
  Object.assign(shop.phase, { name: 'morning', dawnClaimed: true });
  shop.pads.done = districtDef('q1').pads.map((p) => p.id);
  const text = serialize(s);
  const ctx2 = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'fr-FR' });
  await ctx2.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [SAVE_KEY, text]);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errors.push(e.message));
  await p2.goto(`file://${join(ROOT, 'dist/index.html')}`);
  await p2.waitForTimeout(1500);
  await p2.touchscreen.tap(180, 320);
  await p2.waitForTimeout(1600);
  await p2.screenshot({ path: join(OUT, '08-deblocage.png') });
  await p2.tap('#unlock-ok');
  await p2.waitForTimeout(900);
  await p2.tap('#hub-catalog');
  await p2.waitForTimeout(700);
  await p2.screenshot({ path: join(OUT, '09-catalogue.png') });
  await p2.tap('.panel-back');
  await p2.waitForTimeout(800);
  await p2.tap('#hub-upgrades');
  await p2.waitForTimeout(700);
  await p2.screenshot({ path: join(OUT, '10-ameliorer.png') });
  await p2.tap('.panel-back');
  await p2.waitForTimeout(800);
  await p2.tap('#hub-editor');
  await p2.waitForTimeout(1200);
  await p2.screenshot({ path: join(OUT, '11-amenager.png') });
  await ctx2.close();
}
// Pleine Lune (build de test : on avance l'horloge du jeu avec window.__FB_TEST__).
{
  const s = defaultSave({ seed: 12, now: 0, lang: 'fr' });
  s.progress.flags.introDone = true;
  s.progress.flags.firstChestDone = true;
  s.progress.flags.editorSeen = true;
  Object.assign(s.stats, { cycles: 6, nights: 6 });
  Object.assign(s.player, { level: 6, coins: 400 });
  const shop = s.shops.q1;
  Object.assign(shop, { day: 7, night: 7, bossAssist: 1 });
  Object.assign(shop.phase, { name: 'morning', dawnClaimed: true });
  shop.pads.done = districtDef('q1').pads.map((p) => p.id);
  const ctx3 = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'fr-FR' });
  await ctx3.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [SAVE_KEY, serialize(s)]);
  const p3 = await ctx3.newPage();
  p3.on('pageerror', (e) => errors.push(e.message));
  await p3.goto(`file://${join(ROOT, 'dist-test/index.html')}`);
  await p3.waitForTimeout(800);
  await p3.touchscreen.tap(180, 320);
  await p3.waitForTimeout(900);
  await p3.tap('.hub-moon');
  await p3.waitForTimeout(500);
  await p3.screenshot({ path: join(OUT, '12-pleine-lune.png') });
  await p3.tap('.overlay');
  await p3.waitForTimeout(700);
  await p3.tap('.hub-map');
  await p3.waitForTimeout(600);
  await p3.screenshot({ path: join(OUT, '13-carte.png') });
  await p3.tap('.panel-back');
  await p3.waitForTimeout(600);
  await p3.tap('#hub-open');
  // Avance jusqu'à l'entrée du boss (le marchand reste près de la caisse).
  const found = await p3.evaluate(() => {
    const h = window.__FB_TEST__;
    for (let i = 0; i < 600; i++) {
      h.advance(500);
      const sc = h.getState().scene;
      if (sc && sc.night && sc.night.monsters.some((m) => m.type === 'roi_raton')) {
        h.advance(700);
        return true;
      }
    }
    return false;
  });
  if (!found) checks.push('le Roi Raton n’est pas entré');
  await p3.waitForTimeout(100);
  await p3.screenshot({ path: join(OUT, '14-roi-raton.png') });
  await ctx3.close();
}
// M11 : Rush (jour 2), Commande spéciale (jour 3), voleur de la nuit 1 et sa traînée rouge.
{
  const mk = (day, mutate) => {
    const s = defaultSave({ seed: 21, now: 0, lang: 'fr' });
    s.progress.flags.introDone = true;
    s.progress.flags.firstChestDone = true;
    Object.assign(s.stats, { cycles: day - 1, nights: day - 1 });
    Object.assign(s.player, { level: day, coins: 0 });
    const shop = s.shops.q1;
    Object.assign(shop, { day, night: day });
    Object.assign(shop.phase, { name: 'morning', dawnClaimed: true, firstSaleDone: true });
    shop.pads.done = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].slice(0, day * 2);
    // Étagère garnie : les clients (et la Commande spéciale) ont quelque chose à demander.
    const shelf = shop.layout.find((it) => it.id === 'etagere');
    Object.assign(shelf, { product: 'pomme', count: 4 });
    if (mutate) mutate(s);
    return serialize(s);
  };
  const run = async (name, text, until, extraMs, move) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'fr-FR' });
    await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [SAVE_KEY, text]);
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push(e.message));
    await pg.goto(`file://${join(ROOT, 'dist-test/index.html')}`);
    await pg.waitForTimeout(600);
    await pg.touchscreen.tap(180, 320);
    await pg.waitForTimeout(600);
    if (await pg.isVisible('#unlock-ok')) await pg.tap('#unlock-ok');
    if (await pg.isVisible('#hub-open')) await pg.tap('#hub-open');
    const ok = await pg.evaluate(([u, extra]) => {
      const h = window.__FB_TEST__;
      const test = new Function('s', `return ${u};`);
      for (let i = 0; i < 1200; i++) {
        h.advance(100);
        const st = h.getState();
        if (st.scene && test(st.scene)) {
          h.advance(extra);
          return true;
        }
      }
      return false;
    }, [until, extraMs]);
    if (!ok) checks.push(`${name} : situation non atteinte`);
    void move;
    await pg.waitForTimeout(80);
    await pg.screenshot({ path: join(OUT, `${name}.png`) });
    await ctx.close();
  };
  await run('15-rush', mk(2), 's.rush', 600);
  await run('16-commande', mk(3), 's.order && s.order.waiting', 400);
  await run('17-voleur', mk(1, (s) => { Object.assign(s.stats, { cycles: 0, nights: 0 }); s.player.level = 1; s.shops.q1.phase.name = 'night'; s.shops.q1.phase.dayTakings = 120; }),
    's.night && s.night.monsters.some((m) => m.thief && m.carry > 0)', 3600);
}
await browser.close();
process.stdout.write(`captures dans ${OUT}${errors.length ? ` — erreurs : ${errors.join(' | ')}` : ''}\n`);
if (checks.length) {
  process.stderr.write(`vérifications Chromium en échec :\n- ${checks.join('\n- ')}\n`);
  process.exit(1);
}
process.stdout.write('vérifications Chromium : OK\n');
