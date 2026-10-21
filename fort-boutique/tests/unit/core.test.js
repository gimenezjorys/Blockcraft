// M1 : générateur à graine, temps UTC, boucle à pas fixe, réserves d'objets, joystick.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng, seedFrom, hashString } from '../../src/core/rng.js';
import { utcDay, utcWeek, utcWeekday, msUntilNextUtcDay, durationParts, DAY_MS, utcDateParts } from '../../src/core/time.js';
import { createLoop, STEP } from '../../src/core/loop.js';
import { Pool } from '../../src/core/pool.js';
import { Joystick } from '../../src/input/joystick.js';
import { EventQueue } from '../../src/core/events.js';

test('rng : même graine -> même suite (1 000 tirages)', () => {
  const a = new Rng(123456789);
  const b = new Rng(123456789);
  for (let i = 0; i < 1000; i++) assert.equal(a.next(), b.next());
  const c = new Rng(123456790);
  const sa = new Rng(123456789);
  let same = 0;
  for (let i = 0; i < 1000; i++) if (sa.next() === c.next()) same++;
  assert.ok(same < 5, 'deux graines voisines donnent des suites différentes');
});

test('rng : bornes, uniformité grossière, tirage pondéré', () => {
  const r = new Rng(42);
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6000; i++) {
    const v = r.int(6);
    assert.ok(v >= 0 && v < 6 && Number.isInteger(v));
    counts[v]++;
  }
  for (const c of counts) assert.ok(c > 850 && c < 1150, `répartition ${counts}`);
  for (let i = 0; i < 500; i++) {
    const v = r.intRange(2, 5);
    assert.ok(v >= 2 && v <= 5);
    const f = r.next();
    assert.ok(f >= 0 && f < 1);
  }
  const w = { a: 0, b: 0 };
  for (let i = 0; i < 4000; i++) w[r.weighted(['a', 'b'], (x) => (x === 'a' ? 3 : 1))]++;
  assert.ok(w.a / w.b > 2.5 && w.a / w.b < 3.5);
  assert.equal(r.weighted(['a'], () => 0), undefined);
});

test('rng : fork(label) indépendant et sans consommer le parent', () => {
  const p1 = new Rng(7);
  const p2 = new Rng(7);
  const f1 = p1.fork('nuit');
  const f2 = p2.fork('nuit');
  for (let i = 0; i < 100; i++) assert.equal(f1.next(), f2.next());
  assert.equal(p1.next(), new Rng(7).next(), 'le parent n’a pas été consommé');
  const g = new Rng(7).fork('jour');
  const h = new Rng(7).fork('nuit');
  assert.notEqual(g.next(), h.next());
  assert.equal(seedFrom(1, 'q1', 2), seedFrom(1, 'q1', 2));
  assert.notEqual(seedFrom(1, 'q1', 2), seedFrom(1, 'q1', 3));
  assert.equal(hashString('abc'), hashString('abc'));
});

test('rng : état sauvegardable et restaurable', () => {
  const r = new Rng(99);
  r.next();
  const s = r.getState();
  const x = [r.next(), r.next()];
  r.setState(s);
  assert.deepEqual([r.next(), r.next()], x);
});

test('temps : frontières UTC 23:59:59.999 / 00:00:00.000', () => {
  const end = Date.UTC(2026, 9, 19, 23, 59, 59, 999);
  const start = Date.UTC(2026, 9, 20, 0, 0, 0, 0);
  assert.equal(utcDay(start) - utcDay(end), 1);
  assert.equal(msUntilNextUtcDay(end), 1);
  assert.equal(msUntilNextUtcDay(start), DAY_MS);
  assert.deepEqual(utcDateParts(end), { year: 2026, month: 10, day: 19 });
  assert.deepEqual(utcDateParts(start), { year: 2026, month: 10, day: 20 });
});

test('temps : la semaine UTC commence le lundi', () => {
  const sunday = Date.UTC(2026, 9, 18, 23, 59, 59, 999); // dimanche 18 octobre 2026
  const monday = Date.UTC(2026, 9, 19, 0, 0, 0, 0); // lundi 19 octobre 2026
  assert.equal(utcWeek(monday) - utcWeek(sunday), 1);
  assert.equal(utcWeekday(monday), 0);
  assert.equal(utcWeekday(sunday), 6);
  const nextSunday = Date.UTC(2026, 9, 25, 23, 0, 0);
  assert.equal(utcWeek(nextSunday), utcWeek(monday));
  assert.equal(utcWeek(Date.UTC(1970, 0, 5)), 1); // premier lundi de l'époque
});

test('temps : durées relatives', () => {
  assert.deepEqual(durationParts((5 * 3600 + 12 * 60) * 1000), { d: 0, h: 5, m: 12, s: 0 });
  assert.deepEqual(durationParts(-5), { d: 0, h: 0, m: 0, s: 0 });
  assert.equal(durationParts(DAY_MS + 1000).d, 1);
});

function fakeRaf() {
  const q = [];
  return {
    raf: (cb) => q.push(cb),
    tick(ts) {
      const cbs = q.splice(0);
      for (const cb of cbs) cb(ts);
    },
  };
}

test('boucle : pas fixes de 1/60 s, au plus 5 pas par image, timeScale', () => {
  let steps = 0;
  let renders = 0;
  const r = fakeRaf();
  const loop = createLoop({ step: (dt) => { steps++; assert.ok(Math.abs(dt - STEP) < 1e-12); }, render: () => renders++, raf: r.raf });
  loop.start();
  r.tick(0);
  const s0 = steps;
  r.tick(1000 / 60);
  assert.equal(steps - s0, 1);
  r.tick(1000 / 60 + 200); // 200 ms d'un coup -> plafonné à 5 pas
  assert.equal(steps - s0 - 1, 5);
  loop.timeScale = 0.5;
  const s1 = steps;
  r.tick(1000 / 60 + 200 + 1000 / 30); // 33 ms * 0.5 = 1 pas
  assert.equal(steps - s1, 1);
  assert.ok(renders >= 4);
});

test('boucle : pause et reprise, avance déterministe', () => {
  let steps = 0;
  const loop = createLoop({ step: () => steps++, render: () => {} });
  loop.advance(1000);
  assert.equal(steps, 60);
  loop.pause('hidden');
  loop.advance(1000);
  assert.equal(steps, 60, 'aucun pas pendant la pause');
  loop.resume('hidden');
  loop.advance(500);
  assert.equal(steps, 90);
  loop.slowMo(0.3, 0.35);
  const before = steps;
  loop.advance(350);
  assert.ok(steps - before <= 7 && steps - before >= 5, `ralenti : ${steps - before} pas`);
});

test('réserve : plafond, recyclage, retrait pendant un parcours', () => {
  let created = 0;
  const pool = new Pool(() => ({ id: ++created, alive: true }), 3);
  const a = pool.acquire();
  const b = pool.acquire();
  pool.acquire();
  assert.equal(pool.acquire(), null);
  assert.equal(pool.refused, 1);
  pool.release(b);
  const d = pool.acquire();
  assert.equal(d, b, 'objet recyclé');
  for (let i = pool.active.length - 1; i >= 0; i--) pool.releaseAt(i);
  assert.equal(pool.size, 0);
  assert.equal(created, 3);
  void a;
});

test('joystick : zone morte 6 px, rayon 52 px, vecteur normalisé, suivi, décélération 60 ms', () => {
  const j = new Joystick();
  j.begin(1, 100, 400);
  j.move(104, 400);
  assert.equal(j.vx, 0, 'zone morte');
  j.move(152, 400);
  assert.ok(Math.abs(j.vx - 1) < 1e-9);
  j.move(129, 400);
  assert.ok(j.vx > 0.4 && j.vx < 0.6);
  j.move(100, 500); // au-delà du rayon : le centre suit le doigt
  assert.ok(Math.abs(Math.hypot(j.vx, j.vy) - 1) < 1e-9);
  assert.ok(Math.hypot(500 - j.oy, 100 - j.ox) <= 52.0001);
  j.end();
  j.update(0.03);
  assert.ok(j.vy > 0.3 && j.vy < 0.7, 'décélération en cours');
  j.update(0.04);
  assert.equal(j.vy, 0);
});

test('file d’événements : enregistrements réutilisés, plafond', () => {
  const q = new EventQueue(2);
  q.push('coin', 1, 2, 3);
  const first = q.items[0];
  q.push('hit');
  q.push('trop');
  assert.equal(q.length, 2);
  assert.equal(q.dropped, 1);
  q.clear();
  q.push('kill');
  assert.equal(q.items[0], first);
  assert.equal(first.type, 'kill');
});
