// Fort Boutique — succès (G14.3, niveau 6) : chaque succès se déclenche une seule fois et verse ses rubis tout de suite
// (rétroactif à l'ouverture). Les mesures viennent des statistiques de la sauvegarde.
import { ACHIEVEMENTS } from '../data/achievements.js';
import { now, utcDay } from '../core/time.js';
import { isUnlocked } from './progression.js';
import { ownedFurnitureIds } from './chests.js';

/** Valeur actuelle d'une mesure. */
export function achievementMetric(save, metric) {
  const st = save.stats;
  const [kind, arg] = metric.split(':');
  switch (kind) {
    case 'sold': return st.sold || 0;
    case 'vip': return st.vipServed || 0;
    case 'nights3': return st.nights3 || 0;
    case 'thieves': return st.thievesCaught || 0;
    case 'boss': return (st.bossKills && st.bossKills[arg]) || 0;
    case 'boss5': return (st.bossKillsW5 && st.bossKillsW5[arg]) || 0;
    case 'furnTypes': return ownedFurnitureIds(save).length;
    case 'furnLevel': return Math.max(0, ...Object.values(save.furniture).map((f) => (f && f.level) || 0));
    case 'dailyStreak': return save.daily.challenge.streak || 0;
    case 'kills': return save.collections.bestiary[arg] || 0;
    case 'mokaLevel': return save.player.cat && save.player.cat.unlocked ? save.player.cat.level : 0;
    case 'endlessBest': return (save.endless && save.endless.best) || 0;
    case 'franchiseStars': return Object.values(save.shops).reduce((a, s) => a + ((s && s.franchiseStars) || 0), 0);
    default: return 0;
  }
}

/**
 * Succès nouvellement obtenus (une seule fois chacun) ; les rubis sont versés.
 * @param {any} save
 * @param {number} [t]
 * @returns {Array<{ id: string, rubies: number }>}
 */
export function checkAchievements(save, t = now()) {
  if (!isUnlocked(save, 'achievements')) return [];
  const got = save.collections.achievements;
  const out = [];
  for (const a of ACHIEVEMENTS) {
    if (got[a.id] !== undefined) continue;
    if (achievementMetric(save, a.metric) < a.goal) continue;
    got[a.id] = utcDay(t);
    save.player.rubies += a.rubies;
    out.push({ id: a.id, rubies: a.rubies });
  }
  return out;
}
