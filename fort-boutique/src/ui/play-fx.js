// Fort Boutique — « juice » (G20.6) : chaque événement de la simulation devient son, particules, textes, secousse.
import { PALETTE as P } from '../data/palette.js';
import { COIN_COUNTER } from '../render/hud.js';

const C = 48;

/**
 * @param {{ app: any, g: any, fx: import('../render/particles.js').Particles, floaters: import('../render/floaters.js').Floaters,
 *   camera: import('../render/camera.js').Camera, view: any }} ctx
 */
export function createFxHandler({ app, g, fx, floaters, camera, view }) {
  const px = (x) => g.grid.origin.x + x * C;
  const py = (y) => g.grid.origin.y + y * C;
  const audio = () => app.services.audio;
  const play = (id, o) => {
    const a = audio();
    if (a) a.play(id, o);
  };
  const vibrate = (ms) => {
    if (app.services.vibrate) app.services.vibrate(ms);
  };
  const reduced = () => !!(app.services.settings && app.services.settings.reducedMotion);
  const shake = (amp, dur) => {
    if (!reduced()) camera.shake(amp, dur);
  };
  let pouf = 0;

  return function onEvent(e) {
    switch (e.type) {
      case 'pickup':
        view.comboT = 1.5;
        play('pickup', { n: e.a - 1 });
        break;
      case 'drop':
        play('drop');
        break;
      case 'door_bell':
        play('door_bell');
        break;
      case 'vip':
        play('vip');
        break;
      case 'kaching':
        play('kaching');
        floaters.add(`+${e.a}`, px(e.x), py(e.y) - 30, { color: P.orReflet, size: 15 });
        break;
      case 'happy':
        view.hearts.push({ x: px(e.x), y: py(e.y) - 30, t: 0 });
        play('happy');
        break;
      case 'grumpy':
        fx.burst('smoke', px(e.x), py(e.y) - 20, 5, '#BDC6CF', 20, 0.8, 5);
        play('grumpy');
        break;
      case 'coins': {
        const n = Math.min(12, Math.max(1, Math.ceil(e.a / 3)));
        for (let i = 0; i < n; i++) fx.coinFlight(px(e.x), py(e.y) - 10, COIN_COUNTER.x, COIN_COUNTER.y, i * 0.04, e.a / n);
        break;
      }
      case 'pad_tick':
        play('pad_tick', { n: e.a });
        if (e.a % 2 === 0) fx.coinFlight(COIN_COUNTER.x, COIN_COUNTER.y, px(e.x), py(e.y), 0, 0);
        view.coins = g.save.player.coins;
        break;
      case 'build_pop':
        play('build_pop');
        vibrate(15);
        fx.burst('dust', px(e.x), py(e.y) + 10, 8, '#E8D3B0', 70, 0.6, 5);
        shake(2, 0.1);
        break;
      case 'close_shop':
        play('close_shop');
        break;
      case 'eyes_open':
        play('eyes_open');
        view.eyesOpened++;
        if (view.eyesOpened === g.furn.length) play('eyes_boing', { at: 0.15 });
        break;
      case 'wave_warn':
        play('wave_warn');
        break;
      case 'wave_start':
        play('wave_start');
        view.banner = { text: `${e.a + 1}/${e.b}`, t: 0, life: 1.4, color: P.craieJaune };
        break;
      case 'wave_clear':
        play('wave_clear');
        view.cleared = e.a + 1;
        view.banner = { text: `${e.a + 1}/${e.b} ✓`, t: 0, life: 1.4, color: P.etiquetteVerte };
        if (!reduced()) app.loop.slowMo(0.3, 0.35);
        else app.loop.slowMo(0.6, 0.15);
        camera.targetZoom = 1.04;
        view.zoomT = 0.35;
        break;
      case 'shot':
        play(e.s === 'coin' ? 'shot_coin' : e.s === 'frost' ? 'frost' : 'shot_can');
        break;
      case 'lob':
        play('lob');
        break;
      case 'splat':
        play('splat');
        fx.burst('spark', px(e.x), py(e.y), 5, e.s === 'spore' ? P.yeuxGrignotins : e.s === 'jam' ? '#9B5DE5' : P.pomme, 60, 0.35, 3);
        break;
      case 'hit':
      case 'hit_armor':
        play(e.type === 'hit' ? 'hit' : 'armor');
        if (e.a > 0) floaters.add(String(e.a), px(e.x) + ((e.a * 7) % 9) - 4, py(e.y) - 18, { color: P.craie, size: 12, life: 0.6, rise: 22 });
        if (e.b) {
          // Gros coup : arrêt sur image 50 ms + secousse 3 px.
          app.loop.slowMo(0.0001, 0.05);
          shake(3, 0.12);
        }
        break;
      case 'kill':
        play('pouf', { n: pouf++ });
        fx.burst('star', px(e.x), py(e.y) - 12, 8, P.craieJaune, 90, 0.5, 3);
        for (let i = 0; i < 2 + (e.a % 3); i++) fx.burst('spark', px(e.x), py(e.y) - 10, 1, P.or, 70, 0.45, 3);
        if (e.a > 0) {
          for (let i = 0; i < Math.min(4, e.a); i++) fx.coinFlight(px(e.x), py(e.y) - 10, 230, 30, 0.15 + i * 0.05, 0);
        }
        if (e.b) shake(5, 0.4);
        break;
      case 'thief_grab':
        play('thief_grab');
        vibrate(25);
        view.jarBlink = 1;
        break;
      case 'thief_caught':
        play('thief_caught');
        for (let i = 0; i < 8; i++) fx.coinFlight(px(e.x), py(e.y) - 10, 231, 30, i * 0.04, 0);
        floaters.add(`+${e.a}`, px(e.x), py(e.y) - 34, { color: P.etiquetteVerte, size: 16, life: 0.9 });
        break;
      case 'thief_escape':
        view.jarBlink = 1;
        break;
      case 'broken':
        play('broken');
        fx.burst('smoke', px(e.x), py(e.y) - 10, 8, '#7A7A88', 30, 1.0, 6);
        shake(2, 0.15);
        break;
      case 'repair':
        play('repair');
        fx.burst('spark', px(e.x), py(e.y) - 14, 2, P.craieJaune, 40, 0.3, 2);
        break;
      case 'revived':
        play('build_pop', { gain: 0.6 });
        break;
      case 'bell':
        play('bell');
        vibrate(40);
        view.shock = { x: px(e.x), y: py(e.y), t: 0 };
        shake(6, 0.3);
        if (app.services.duckMusic) app.services.duckMusic();
        break;
      case 'bell_empty':
        play('bell_empty');
        break;
      case 'chomp':
        play('chomp');
        break;
      case 'zap':
      case 'flame':
      case 'swirl':
      case 'stomp':
      case 'gust':
      case 'nail':
        play(e.type === 'zap' ? 'zap' : e.type === 'swirl' || e.type === 'gust' ? 'swirl' : e.type === 'flame' ? 'flame' : 'hit');
        view.flashes.push({ x: e.x, y: e.y, r: 0.8, t: 0 });
        break;
      case 'explode':
        play('broken');
        fx.burst('smoke', px(e.x), py(e.y) - 10, 12, '#FF9F43', 90, 0.6, 6);
        shake(4, 0.2);
        break;
      case 'boss_enter':
        play('boss');
        app.loop.slowMo(0.3, 0.4);
        camera.targetZoom = 1.08;
        view.zoomT = 1.2;
        view.bossIntro = { type: e.s, t: 0 };
        break;
      case 'level_up':
        play('level_up');
        view.banner = { text: `${e.a}`, t: 0, life: 1.6, color: P.or, level: true };
        break;
      default:
    }
  };
}
