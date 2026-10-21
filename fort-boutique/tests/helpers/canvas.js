// Canvas simulé : faux contexte 2D qui enregistre et compte les appels de dessin (D1.4).

const DRAW_CALLS = new Set([
  'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'drawImage',
  'fillText', 'strokeText', 'putImageData',
]);

const NOOP_METHODS = [
  'save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse',
  'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo', 'clip', 'translate', 'rotate', 'scale',
  'setTransform', 'transform', 'resetTransform', 'setLineDash',
];

export class CanvasStats {
  constructor() {
    this.drawCalls = 0;
    this.byMethod = {};
    this.contexts = 0;
  }
  reset() {
    this.drawCalls = 0;
    this.byMethod = {};
  }
}

class FakeGradient {
  addColorStop() {}
}

export class FakeContext2D {
  constructor(canvas, stats) {
    this.canvas = canvas;
    this._stats = stats;
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.font = '10px sans-serif';
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';
    this.imageSmoothingEnabled = true;
    this.shadowBlur = 0;
    this.shadowColor = 'transparent';
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this.filter = 'none';
    this.lineDashOffset = 0;
  }
  measureText(text) {
    const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] || '10');
    return { width: String(text).length * size * 0.56, actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2 };
  }
  createLinearGradient() { return new FakeGradient(); }
  createRadialGradient() { return new FakeGradient(); }
  createPattern() { return {}; }
  getImageData(x, y, w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }; }
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }; }
  getLineDash() { return []; }
  isPointInPath() { return false; }
  getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
}
for (const m of NOOP_METHODS) FakeContext2D.prototype[m] = function () {};
for (const m of DRAW_CALLS) {
  FakeContext2D.prototype[m] = function () {
    const s = this._stats;
    s.drawCalls++;
    s.byMethod[m] = (s.byMethod[m] || 0) + 1;
  };
}

/**
 * Installe le canvas simulé dans une fenêtre jsdom (ou un faux document Node).
 * @param {Window} window
 * @returns {CanvasStats}
 */
export function installCanvas(window) {
  const stats = new CanvasStats();
  const proto = window.HTMLCanvasElement.prototype;
  const ctxs = new WeakMap();
  proto.getContext = function (type) {
    if (type !== '2d') return null;
    if (!ctxs.has(this)) {
      ctxs.set(this, new FakeContext2D(this, stats));
      stats.contexts++;
    }
    return ctxs.get(this);
  };
  proto.toDataURL = function () { return 'data:image/png;base64,'; };
  proto.toBlob = function (cb) { cb(null); };
  return stats;
}

/** Canvas autonome pour les tests Node sans jsdom. */
export function makeNodeCanvas(stats = new CanvasStats(), w = 360, h = 640) {
  const canvas = { width: w, height: h, style: {} };
  canvas.getContext = () => canvas._ctx || (canvas._ctx = new FakeContext2D(canvas, stats));
  return canvas;
}
