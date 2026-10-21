// Fort Boutique — scène canvas de l'éditeur d'aménagement (G6.5) : grille avec repères, trajets en pointillés,
// meubles de la copie de travail, fantôme aimanté vert/rouge, main fantôme du Conseil de Mamie.
import { PALETTE as P } from '../data/palette.js';
import { FURNITURE, footprint } from '../data/furniture.js';
import { gridSize, gridOrigin, reservedCells, districtEntrances, doorCell } from '../game/shop.js';
import { itemAt, testPlacement, moveItem, placeFromStorage, pathPolylines } from '../game/editor.js';
import { drawShopShell, drawBackdrop } from '../render/sprites/shop.js';
import { drawFurniture } from '../render/sprites/furniture.js';
import { rr } from '../render/sprites/draw.js';

const C = 48;

/**
 * @param {any} app
 * @param {any} ed session d'édition (game/editor.js)
 * @param {{ theme: string, onChange: () => void, onSelect: (idx: number) => void, onInvalid: (reason: string) => void }} o
 */
export function createEditorScene(app, ed, o) {
  let shell = null;
  let shellKey = '';
  const view = { showCustomers: true, showMonsters: true, drag: null, hint: null, t: 0, paths: null };

  function grid() {
    const [w, h] = gridSize(ed.expansion);
    return { w, h, origin: gridOrigin(w), entrances: districtEntrances(ed.districtId, w, h), door: doorCell(w, h) };
  }

  function ensureShell(gr) {
    const ps = Math.min(3, app.viewport().scale * Math.min(2, window.devicePixelRatio || 1));
    const key = `${gr.w}x${gr.h}|${o.theme}|${ps}`;
    if (shell && key === shellKey) return;
    shellKey = key;
    shell = document.createElement('canvas');
    shell.width = Math.ceil(360 * ps);
    shell.height = Math.ceil(640 * ps);
    const c = shell.getContext('2d');
    c.setTransform(ps, 0, 0, ps, 0, 0);
    drawShopShell(c, gr, { theme: o.theme });
  }

  /** Case (entière) sous un point logique ; null hors grille. */
  function cellAt(x, y, gr) {
    const cx = Math.floor((x - gr.origin.x) / C);
    const cy = Math.floor((y - gr.origin.y) / C);
    return { cx, cy, inside: cx >= 0 && cy >= 0 && cx < gr.w && cy < gr.h };
  }

  function refreshPaths() {
    view.paths = pathPolylines(ed);
  }
  refreshPaths();

  function drawPath(ctx, cells, w, ox, oy, color, offset) {
    if (cells.length < 2) return;
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.lineDashOffset = -view.t * 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    cells.forEach((i, k) => {
      const x = ox + ((i % w) + 0.5) * C + offset;
      const y = oy + (Math.floor(i / w) + 0.5) * C + offset;
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  const scene = {
    joystick: false,
    view,
    ed,
    refreshPaths,
    update(dt) {
      view.t += dt;
    },
    render(ctx) {
      const gr = grid();
      ensureShell(gr);
      drawBackdrop(ctx);
      ctx.drawImage(shell, 0, 0, 360, 640);
      const ox = gr.origin.x;
      const oy = gr.origin.y;
      // Repères de la grille et cases réservées.
      ctx.strokeStyle = 'rgba(43,26,51,.18)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= gr.w; x++) {
        ctx.beginPath();
        ctx.moveTo(ox + x * C, oy);
        ctx.lineTo(ox + x * C, oy + gr.h * C);
        ctx.stroke();
      }
      for (let y = 0; y <= gr.h; y++) {
        ctx.beginPath();
        ctx.moveTo(ox, oy + y * C);
        ctx.lineTo(ox + gr.w * C, oy + y * C);
        ctx.stroke();
      }
      for (const [i] of reservedCells(ed.districtId, gr.w, gr.h)) {
        ctx.fillStyle = 'rgba(255,107,107,.16)';
        ctx.fillRect(ox + (i % gr.w) * C + 3, oy + Math.floor(i / gr.w) * C + 3, C - 6, C - 6);
      }
      // Meubles (sauf celui qu'on déplace).
      const drag = view.drag;
      const order = ed.layout.map((it, i) => i).sort((a, b) => ed.layout[a].y - ed.layout[b].y);
      for (const i of order) {
        if (drag && drag.kind === 'move' && drag.idx === i && drag.moved) continue;
        const it = ed.layout[i];
        const [w, h] = footprint(FURNITURE[it.id], it.rot || 0);
        drawFurniture(ctx, it.id, ox + it.x * C, oy + it.y * C, w * C, h * C, {});
        if (i === ed.selected) {
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -view.t * 10;
          ctx.strokeStyle = P.craie;
          ctx.lineWidth = 3;
          rr(ctx, ox + it.x * C + 1, oy + it.y * C - 6, w * C - 2, h * C + 4, 8);
          ctx.stroke();
          ctx.restore();
        }
      }
      // Trajets.
      if (view.paths) {
        if (view.showCustomers) for (const p of view.paths.customers) drawPath(ctx, p, gr.w, ox, oy, P.craieBleue, -4);
        if (view.showMonsters) for (const p of view.paths.monsters) drawPath(ctx, p, gr.w, ox, oy, P.yeuxGrignotins, 4);
      }
      // Fantôme aimanté.
      if (drag && drag.moved && drag.cx !== undefined) {
        const [w, h] = footprint(FURNITURE[drag.id], drag.rot || 0);
        const x = ox + drag.cx * C;
        const y = oy + drag.cy * C;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = drag.valid ? P.etiquetteVerte : P.danger;
        ctx.fillRect(x, y, w * C, h * C);
        ctx.globalAlpha = 0.75;
        drawFurniture(ctx, drag.id, x, y, w * C, h * C, {});
        ctx.globalAlpha = 1;
        if (!drag.valid) {
          // Icône « chemin bloqué ».
          ctx.fillStyle = P.danger;
          ctx.strokeStyle = P.encre;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + (w * C) / 2, y - 12, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = P.blanc;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + (w * C) / 2 - 5, y - 12);
          ctx.lineTo(x + (w * C) / 2 + 5, y - 12);
          ctx.stroke();
        }
      }
      // Main fantôme : propose un déplacement (G19 6:50).
      if (view.hint && !drag) {
        const k = (view.t % 1.8) / 1.8;
        const a = view.hint.from;
        const b = view.hint.to;
        const e = k < 0.15 ? 0 : k > 0.75 ? 1 : (k - 0.15) / 0.6;
        const hx = ox + (a.x + 0.5 + (b.x - a.x) * e) * C;
        const hy = oy + (a.y + 0.5 + (b.y - a.y) * e) * C;
        ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 0.9;
        ctx.fillStyle = P.craie;
        ctx.strokeStyle = P.encre;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hx, hy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(hx - 3, hy - 26, 6, 18);
        ctx.strokeRect(hx - 3, hy - 26, 6, 18);
        ctx.globalAlpha = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = P.craieJaune;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox + b.x * C + 3, oy + b.y * C + 3, C - 6, C - 6);
        ctx.setLineDash([]);
      }
    },
    /** Gestes du doigt sur le canvas (tap = sélection, glisser = déplacer). */
    onPointer(phase, x, y) {
      const gr = grid();
      const c = cellAt(x, y, gr);
      if (phase === 'down') {
        const idx = c.inside ? itemAt(ed, c.cx, c.cy) : -1;
        if (idx >= 0) {
          const it = ed.layout[idx];
          view.drag = { kind: 'move', idx, id: it.id, rot: it.rot || 0, ox: c.cx - it.x, oy: c.cy - it.y, sx: x, sy: y, moved: false };
          ed.selected = idx;
          o.onSelect(idx);
        } else {
          ed.selected = -1;
          o.onSelect(-1);
        }
        return;
      }
      const drag = view.drag;
      if (!drag) return;
      if (phase === 'move') {
        if (!drag.moved && Math.hypot(x - drag.sx, y - drag.sy) > 8) drag.moved = true;
        if (!drag.moved) return;
        drag.cx = c.cx - (drag.ox || 0);
        drag.cy = c.cy - (drag.oy || 0);
        const item = { id: drag.id, x: drag.cx, y: drag.cy, rot: drag.rot };
        drag.valid = c.inside && testPlacement(ed, drag.kind === 'move' ? drag.idx : -1, item).ok;
        return;
      }
      // up / cancel
      view.drag = null;
      if (phase === 'cancel' || !drag.moved || drag.cx === undefined) return;
      const r = drag.kind === 'move' ? moveItem(ed, drag.idx, drag.cx, drag.cy) : placeFromStorage(ed, drag.storageIdx, drag.cx, drag.cy, drag.rot);
      if (r.ok) {
        if (drag.kind === 'place') {
          ed.selected = r.idx;
          o.onSelect(r.idx);
        }
        view.hint = null;
        refreshPaths();
        o.onChange();
      } else {
        o.onInvalid(r.reason || 'path');
      }
    },
    /** Commence à faire glisser un meuble de la Réserve (le doigt est sur la barre du bas). */
    beginPlace(storageIdx, x, y) {
      const id = ed.storage[storageIdx];
      if (!id) return;
      view.drag = { kind: 'place', storageIdx, id, rot: 0, ox: 0, oy: 0, sx: x, sy: y, moved: true };
      scene.onPointer('move', x, y);
    },
    snapshot() {
      return {
        editor: true,
        layout: ed.layout.map((it) => ({ id: it.id, x: it.x, y: it.y, rot: it.rot || 0, product: it.product || null })),
        storage: ed.storage.slice(),
        selected: ed.selected,
        moves: ed.moves,
        drag: view.drag ? { id: view.drag.id, cx: view.drag.cx, cy: view.drag.cy, valid: !!view.drag.valid } : null,
        grid: grid(),
        hint: view.hint,
      };
    },
  };
  return scene;
}
