// Fort Boutique — entrées unifiées (B6). Complété en M1.
import { perfNow } from '../core/time.js';

const mode = { pointerSeen: false, lastTouchAt: -1e9 };

/**
 * Déduplication des familles d'événements : Pointer Events en priorité,
 * puis Touch Events, puis Mouse Events. Un geste n'est jamais traité deux fois.
 * @param {'pointer' | 'touch' | 'mouse'} family
 * @returns {boolean} vrai si l'événement doit être traité
 */
export function acceptFamily(family) {
  if (family === 'pointer') {
    mode.pointerSeen = true;
    return true;
  }
  if (mode.pointerSeen) return false;
  if (family === 'touch') {
    mode.lastTouchAt = perfNow();
    return true;
  }
  return perfNow() - mode.lastTouchAt > 800;
}

/** Remet la déduplication à zéro (tests). */
export function resetInputMode() {
  mode.pointerSeen = false;
  mode.lastTouchAt = -1e9;
}
