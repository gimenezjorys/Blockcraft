// M2 : sauvegarde (B9) — aller-retour, copies de secours, migrations, export, stockage défaillant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createStorage } from '../../src/save/storage.js';
import { serialize, parseAndVerify, loadSave, SaveManager, SAVE_KEY, BAK1_KEY, BAK2_KEY, CORRUPT_KEY } from '../../src/save/save.js';
import { defaultSave, sanitizeSave, CURRENT_VERSION, cloneJson } from '../../src/save/schema.js';
import { migrate, MIGRATIONS } from '../../src/save/migrations.js';
import { exportCode, importCode, summarizeSave, base64urlEncode, base64urlDecode } from '../../src/save/export.js';
import { crc32, utf8 } from '../../src/save/crc32.js';
import { ROOT } from '../helpers/dom.js';

const CTX = { seed: 1, now: 1792411200000, lang: 'fr' };

/** localStorage simulé (Map). */
function fakeLocalStorage({ throwOnSet = false } = {}) {
  const m = new Map();
  return {
    map: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (throwOnSet && k !== 'fortboutique.probe') {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      }
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
  };
}

function storageWith(entries = {}) {
  const ls = fakeLocalStorage();
  for (const [k, v] of Object.entries(entries)) ls.map.set(k, v);
  return { st: createStorage({ localStorage: ls }), ls };
}

function fixture(n) {
  return JSON.parse(readFileSync(join(ROOT, 'tests/fixtures', `save_v${n}.json`), 'utf8'));
}

test('crc32 : valeurs de référence', () => {
  assert.equal(crc32(''), '00000000');
  assert.equal(crc32('123456789'), 'cbf43926');
  assert.equal(crc32(utf8('é')), crc32('é'));
});

test('aller-retour : serialize -> parseAndVerify', () => {
  const s = defaultSave(CTX);
  s.player.coins = 777;
  const r = parseAndVerify(serialize(s));
  assert.equal(r.ok, true);
  const { checksum, ...rest } = r.data;
  assert.match(checksum, /^[0-9a-f]{8}$/);
  const { checksum: _c, ...orig } = s;
  assert.deepEqual(rest, orig);
});

test('checksum faux -> la copie bak1 sert, message « réparée »', () => {
  const good = defaultSave(CTX);
  good.player.coins = 50;
  const bad = serialize({ ...good, player: { ...good.player, coins: 9999 } }).replace('9999', '9998');
  const { st } = storageWith({ [SAVE_KEY]: bad, [BAK1_KEY]: serialize(good) });
  const r = loadSave(st, CTX);
  assert.equal(r.source, 'bak1');
  assert.equal(r.repaired, true);
  assert.equal(r.data.player.coins, 50);
  assert.equal(st.get(CORRUPT_KEY), bad, 'copie .corrupt conservée');
});

test('bak1 faux -> bak2', () => {
  const g = defaultSave(CTX);
  g.player.rubies = 12;
  const { st } = storageWith({ [SAVE_KEY]: '{"oups"', [BAK1_KEY]: 'pas du json', [BAK2_KEY]: serialize(g) });
  const r = loadSave(st, CTX);
  assert.equal(r.source, 'bak2');
  assert.equal(r.data.player.rubies, 12);
});

test('tout faux -> nouvelle partie + copie .corrupt, jamais écrasée ensuite', () => {
  const { st } = storageWith({ [SAVE_KEY]: 'cassé-1', [BAK1_KEY]: 'x', [BAK2_KEY]: 'y' });
  const r = loadSave(st, CTX);
  assert.equal(r.source, 'new');
  assert.equal(r.repaired, true);
  assert.equal(r.data.player.level, 1);
  assert.equal(st.get(CORRUPT_KEY), 'cassé-1');
  st.set(SAVE_KEY, 'cassé-2');
  loadSave(st, CTX);
  assert.equal(st.get(CORRUPT_KEY), 'cassé-1', 'la première copie illisible est gardée');
});

test('aucune sauvegarde -> nouvelle partie, pas de message de réparation', () => {
  const { st } = storageWith();
  const r = loadSave(st, CTX);
  assert.equal(r.source, 'new');
  assert.equal(r.repaired, false);
});

test('migration : fixture v0 synthétique -> version courante', () => {
  const v0 = fixture(0);
  const { data, from, to } = migrate(cloneJson(v0));
  assert.equal(from, 0);
  assert.equal(to, CURRENT_VERSION);
  const s = sanitizeSave(data, CTX);
  assert.equal(s.player.coins, 1234);
  assert.equal(s.player.rubies, 17);
  assert.equal(s.player.level, 7);
  assert.equal(s.shops.q1.week, 2);
  assert.equal(s.shops.q1.layout.length, 4);
  assert.equal(s.furniture.etagere.level, 4);
  assert.deepEqual(s.mysteryField, { keep: true, nested: [1, 2, 3] }, 'champ inconnu conservé');
});

test('chaque version a sa fixture et migre jusqu’à la version courante', () => {
  for (let v = 0; v <= CURRENT_VERSION; v++) {
    const f = fixture(v);
    assert.equal(f.version, v);
    const m = migrate(cloneJson(f));
    assert.equal(m.to, CURRENT_VERSION);
    const s = sanitizeSave(m.data, CTX);
    assert.ok(s.player.coins > 0);
    if (v < CURRENT_VERSION) assert.ok(typeof MIGRATIONS[v] === 'function');
  }
});

test('achats et cosmétiques conservés par les migrations et la remise en état', () => {
  const v0 = fixture(0);
  const s = sanitizeSave(migrate(cloneJson(v0)).data, CTX);
  assert.equal(s.purchases.noAds, true);
  assert.deepEqual(s.purchases.receipts, ['rcpt-001']);
  assert.deepEqual(s.purchases.cosmetics, ['pack_lune']);
  for (const c of ['apron_stripes', 'hat_straw', 'theme_pastel']) assert.ok(s.cosmetics.owned.includes(c));
  const v1 = sanitizeSave(cloneJson(fixture(1)), CTX);
  assert.ok(v1.cosmetics.owned.includes('cat_bow'));
  assert.deepEqual(v1.purchases.receipts, ['rcpt-002']);
  assert.deepEqual(v1.futureField, { fromNewerBuild: 'gardé' });
});

test('types corrompus -> valeurs saines, sans plantage ni perte', () => {
  const s = defaultSave(CTX);
  s.player.coins = 'beaucoup';
  s.player.rubies = 40;
  s.settings = 12;
  s.shops.q1.layout = [{ id: 'caisse', x: 3, y: 4 }, null, { id: 5 }, 'x'];
  s.cosmetics.owned = ['hat_straw', 3];
  s.furniture.etagere = { level: 99, plans: -4 };
  const r = sanitizeSave(s, CTX);
  assert.equal(r.player.coins, 0);
  assert.equal(r.player.rubies, 40);
  assert.equal(r.settings.music, 0.8);
  assert.equal(r.shops.q1.layout.length, 1);
  assert.deepEqual(r.cosmetics.owned, ['apron_stripes', 'hat_straw']);
  assert.equal(r.furniture.etagere.level, 10);
  assert.equal(r.furniture.etagere.plans, 0);
});

test('export puis import : identique', () => {
  const s = sanitizeSave(cloneJson(fixture(1)), CTX);
  s.settings.lang = 'en';
  s.player.coins = 31337;
  const code = exportCode(s);
  assert.match(code, /^FB1-[A-Za-z0-9_-]+-[0-9a-f]{8}$/);
  const r = importCode(code, CTX);
  assert.equal(r.ok, true);
  const { checksum: _a, ...x } = r.data;
  const { checksum: _b, ...y } = s;
  assert.deepEqual(x, y);
  assert.deepEqual(summarizeSave(r.data), { level: 9, districts: 1, coins: 31337, rubies: 88 });
  // Les espaces et retours à la ligne d'un copier-coller sont tolérés.
  assert.equal(importCode(code.slice(0, 20) + '\n ' + code.slice(20), CTX).ok, true);
});

test('code invalide refusé', () => {
  const code = exportCode(defaultSave(CTX));
  assert.equal(importCode('', CTX).reason, 'format');
  assert.equal(importCode('FB2-abc-00000000', CTX).reason, 'format');
  const tampered = code.replace(/-([0-9a-f]{8})$/, (m, h) => '-' + (h === '00000000' ? '00000001' : '00000000'));
  assert.equal(importCode(tampered, CTX).reason, 'checksum');
  const parts = code.split('-');
  const body = parts.slice(1, -1).join('-');
  const altered = 'FB1-' + body.slice(0, -2) + (body.endsWith('AA') ? 'BB' : 'AA') + '-' + parts[parts.length - 1];
  assert.equal(importCode(altered, CTX).ok, false);
  const future = JSON.stringify({ version: 99 });
  assert.equal(importCode(`FB1-${base64urlEncode(utf8(future))}-${crc32(future)}`, CTX).reason, 'future');
  const arr = '[1,2]';
  assert.equal(importCode(`FB1-${base64urlEncode(utf8(arr))}-${crc32(arr)}`, CTX).reason, 'format');
});

test('base64url : aller-retour sur toutes les longueurs', () => {
  for (let n = 0; n < 40; n++) {
    const b = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) & 255);
    assert.deepEqual([...base64urlDecode(base64urlEncode(b))], [...b]);
  }
  assert.equal(base64urlDecode('a$bc'), null);
});

test('localStorage qui lève une exception -> repli en mémoire', () => {
  const win = {};
  Object.defineProperty(win, 'localStorage', { get() { throw new Error('SecurityError'); } });
  const st = createStorage(win);
  assert.equal(st.kind, 'memory');
  const r = loadSave(st, CTX);
  const mgr = new SaveManager(st, r.data, { now: () => 0 }, r.text);
  r.data.player.coins = 42;
  assert.equal(mgr.flush(), true);
  assert.equal(loadSave(st, CTX).data.player.coins, 42, 'relu depuis la mémoire');
});

test('quota plein -> aucun plantage, données gardées en mémoire', () => {
  const ls = fakeLocalStorage({ throwOnSet: true });
  const st = createStorage({ localStorage: ls });
  assert.equal(st.kind, 'local');
  const data = defaultSave(CTX);
  const mgr = new SaveManager(st, data, { now: () => 0 }, null);
  data.player.coins = 9;
  assert.equal(mgr.flush(), false);
  assert.equal(st.degraded, true);
  assert.equal(loadSave(st, CTX).data.player.coins, 9);
});

test('écritures regroupées (500 ms) et rotation des copies de secours', () => {
  let t = 0;
  const { st } = storageWith();
  const data = defaultSave(CTX);
  const mgr = new SaveManager(st, data, { now: () => t }, null);
  data.player.coins = 1;
  mgr.request();
  assert.equal(mgr.writes, 1);
  data.player.coins = 2;
  mgr.request();
  t = 200;
  data.player.coins = 3;
  mgr.request();
  mgr.tick();
  assert.equal(mgr.writes, 1, 'regroupées');
  t = 520;
  mgr.tick();
  assert.equal(mgr.writes, 2);
  t = 1100;
  data.player.coins = 4;
  mgr.request();
  assert.equal(mgr.writes, 3);
  const coins = (k) => JSON.parse(st.get(k)).player.coins;
  assert.equal(coins(SAVE_KEY), 4);
  assert.equal(coins(BAK1_KEY), 3);
  assert.equal(coins(BAK2_KEY), 1);
});

test('une copie illisible chargée n’entre jamais dans la rotation', () => {
  const good = defaultSave(CTX);
  good.player.coins = 70;
  const { st } = storageWith({ [SAVE_KEY]: 'abîmé', [BAK1_KEY]: serialize(good) });
  const r = loadSave(st, CTX);
  const mgr = new SaveManager(st, r.data, { now: () => 0 }, r.text);
  r.data.player.coins = 71;
  mgr.flush();
  assert.equal(JSON.parse(st.get(BAK1_KEY)).player.coins, 70);
  assert.notEqual(st.get(BAK2_KEY), 'abîmé');
});
