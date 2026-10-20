// Audio simulé : faux AudioContext qui enregistre les nœuds créés (D1.4).

export class AudioStats {
  constructor() {
    this.created = {};
    this.started = 0;
    this.contexts = 0;
    this.resumed = 0;
    /** @type {Array<{ type: string, freq?: number, at: number }>} */
    this.starts = [];
  }
  count(type) {
    return this.created[type] || 0;
  }
  total() {
    return Object.values(this.created).reduce((a, b) => a + b, 0);
  }
}

class FakeParam {
  constructor(v = 0) {
    this.value = v;
    this.defaultValue = v;
    this.events = [];
  }
  setValueAtTime(v, t) { this.value = v; this.events.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { this.value = v; this.events.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) {
    if (!(v > 0) && !(v < 0)) throw new RangeError('exponentialRamp vers 0');
    this.value = v; this.events.push(['exp', v, t]); return this;
  }
  setTargetAtTime(v, t, c) { this.value = v; this.events.push(['target', v, t, c]); return this; }
  setValueCurveAtTime(curve, t, d) { this.events.push(['curve', curve.length, t, d]); return this; }
  cancelScheduledValues() { return this; }
  cancelAndHoldAtTime() { return this; }
}

class FakeNode {
  constructor(ctx, type) {
    this.context = ctx;
    this.type = type;
    this.outputs = [];
    this.numberOfInputs = 1;
    this.numberOfOutputs = 1;
    ctx._stats.created[type] = (ctx._stats.created[type] || 0) + 1;
  }
  connect(dest) { this.outputs.push(dest); return dest; }
  disconnect() { this.outputs = []; }
}

class FakeSource extends FakeNode {
  constructor(ctx, type) {
    super(ctx, type);
    this.onended = null;
    this.startedAt = null;
  }
  start(t = 0) {
    this.startedAt = t;
    this.context._stats.started++;
    this.context._stats.starts.push({ type: this.type, freq: this.frequency ? this.frequency.value : undefined, at: t });
  }
  stop() {}
}

export class FakeAudioContext {
  constructor(stats) {
    this._stats = stats;
    stats.contexts++;
    this.state = 'running';
    this.sampleRate = 44100;
    this._t = 0;
    this.destination = new FakeNode(this, 'destination');
    this.listener = {};
  }
  get currentTime() { return this._t; }
  _advance(sec) { this._t += sec; }
  resume() { this.state = 'running'; this._stats.resumed++; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createGain() { const n = new FakeNode(this, 'gain'); n.gain = new FakeParam(1); return n; }
  createOscillator() {
    const n = new FakeSource(this, 'oscillator');
    n.frequency = new FakeParam(440);
    n.detune = new FakeParam(0);
    n.type = 'sine';
    n.setPeriodicWave = () => {};
    return n;
  }
  createBiquadFilter() {
    const n = new FakeNode(this, 'biquad');
    n.frequency = new FakeParam(350);
    n.Q = new FakeParam(1);
    n.gain = new FakeParam(0);
    n.detune = new FakeParam(0);
    return n;
  }
  createDynamicsCompressor() {
    const n = new FakeNode(this, 'compressor');
    n.threshold = new FakeParam(-24);
    n.ratio = new FakeParam(12);
    n.attack = new FakeParam(0.003);
    n.release = new FakeParam(0.25);
    n.knee = new FakeParam(30);
    n.reduction = 0;
    return n;
  }
  createConvolver() { const n = new FakeNode(this, 'convolver'); n.buffer = null; n.normalize = true; return n; }
  createStereoPanner() { const n = new FakeNode(this, 'panner'); n.pan = new FakeParam(0); return n; }
  createDelay() { const n = new FakeNode(this, 'delay'); n.delayTime = new FakeParam(0); return n; }
  createWaveShaper() { const n = new FakeNode(this, 'waveshaper'); n.curve = null; return n; }
  createBufferSource() {
    const n = new FakeSource(this, 'buffersource');
    n.buffer = null;
    n.loop = false;
    n.playbackRate = new FakeParam(1);
    return n;
  }
  createConstantSource() { const n = new FakeSource(this, 'constant'); n.offset = new FakeParam(1); return n; }
  createPeriodicWave() { return {}; }
  createBuffer(channels, length, rate) {
    const data = [];
    for (let i = 0; i < channels; i++) data.push(new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate: rate, duration: length / rate, getChannelData: (i) => data[i] };
  }
}

/**
 * Installe l'audio simulé dans une fenêtre.
 * @param {Window} window
 * @returns {AudioStats}
 */
export function installAudio(window) {
  const stats = new AudioStats();
  const Ctor = function () { return new FakeAudioContext(stats); };
  window.AudioContext = Ctor;
  window.webkitAudioContext = Ctor;
  return stats;
}
