// M10 : équilibrage du Quartier 1 (D2.4) sur 40 parties par profil, mêmes seuils que `npm run sim` (300 parties).
// Les graines sont fixes (1000 à 1039) : le résultat est déterministe, le test ne peut pas « clignoter ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableParallelism } from 'node:os';
import { runSims } from '../../scripts/sim.mjs';

test('Quartier 1 : tous les seuils D2.4 applicables sont tenus (40 parties par profil)', async () => {
  // Tous les cœurs : le test reste sous la limite de 90 s de npm test (D1.6), même sur une machine à 2 cœurs.
  const r = await runSims({ runs: 40, maxCycles: 30, workers: availableParallelism() });
  const failed = r.evaluation.rows.filter((x) => !x.ok).map((x) => `${x.id} ${x.label} : ${x.value}`);
  assert.deepEqual(failed, []);
});
