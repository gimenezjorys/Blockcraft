// Garde-fous statiques de l'interface (P1) : jsdom n'applique pas la cascade « hidden contre display »,
// donc on vérifie la règle CSS elle-même (le bug réel ne se voit que dans Chromium, cf. scripts/screens.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shopZoom, screenToWorld } from '../../src/render/camera.js';
import { GRID } from '../../src/data/balance.js';

test('CSS : l’attribut hidden l’emporte toujours (coffre de l’aube, bouton ×2 pendant les 10 premières minutes)', () => {
  const css = readFileSync(new URL('../../src/ui/ui.css', import.meta.url), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
});

test('zoom de base : la petite boutique remplit l’écran, la grande garde 1 ; la fenêtre visible reste dans le monde', () => {
  const [w0, h0] = GRID.sizes[0];
  const z0 = shopZoom(w0, h0);
  assert.ok(z0 >= 1.15 && z0 <= 1.2, `E0 zoom ${z0}`);
  for (const [w, h] of GRID.sizes) {
    const z = shopZoom(w, h);
    assert.ok(z >= 1 && z <= 1.2);
    // La boutique zoomée tient en largeur (bandes de 8 px) et au-dessus de la Cloche (y < 600).
    if (z > 1) {
      assert.ok((w * 48 + 28) * z <= 360 - 8 + 1e-9);
      assert.ok((80 + h * 48 + 34) * z <= 600);
    }
    // Coins de l'écran -> monde : toujours dans 360 × 640 (le voile de nuit couvre tout).
    const p = screenToWorld(z, 0, 640, { x: 0, y: 0 });
    assert.ok(p.x >= 0 && p.y <= 640);
  }
});
