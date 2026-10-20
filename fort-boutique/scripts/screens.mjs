// Fort Boutique — captures 360 × 640 des écrans clés (D3.4), si Playwright est disponible (jamais requis).
// Usage : NODE_PATH=$(npm root -g) node scripts/screens.mjs [dossier]   (défaut : docs/screens)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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
await page.waitForTimeout(6000);
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
await page.waitForTimeout(25000);
await shot('05-aube');
// Vrai navigateur : la sortie et le bouton ×2 restent invisibles tant que le coffre est fermé (P1, G3.8, G18.3).
const checks = [];
const expectHidden = async (sel, why) => {
  if (await page.isVisible(sel)) checks.push(`${sel} visible : ${why}`);
};
await page.waitForSelector('.dawn-chest', { state: 'visible', timeout: 8000 }).catch(() => checks.push('coffre invisible'));
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
await browser.close();
process.stdout.write(`captures dans ${OUT}${errors.length ? ` — erreurs : ${errors.join(' | ')}` : ''}\n`);
if (checks.length) {
  process.stderr.write(`vérifications Chromium en échec :\n- ${checks.join('\n- ')}\n`);
  process.exit(1);
}
process.stdout.write('vérifications Chromium : OK\n');
