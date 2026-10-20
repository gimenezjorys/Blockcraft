// Fort Boutique — parcours en largeur (BFS) et champs de flux sur la grille (G6.3). 4 voisins.

/** Voisins dans un ordre fixe (haut, droite, bas, gauche) : départages déterministes. */
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/**
 * Parcours en largeur multi-sources.
 * @param {number} w
 * @param {number} h
 * @param {number[]} sources indices de départ (distance 0)
 * @param {(i: number) => boolean} passable
 * @param {Int16Array} [out] tableau réutilisé
 * @returns {Int16Array} distances (−1 = inaccessible)
 */
export function bfs(w, h, sources, passable, out) {
  const n = w * h;
  const dist = out && out.length === n ? out : new Int16Array(n);
  dist.fill(-1);
  const queue = new Int16Array(n);
  let head = 0;
  let tail = 0;
  for (const s of sources) {
    if (s < 0 || s >= n || dist[s] === 0) continue;
    dist[s] = 0;
    queue[tail++] = s;
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const y = (i / w) | 0;
    const d = dist[i] + 1;
    for (let k = 0; k < 4; k++) {
      const nx = x + DIRS[k][0];
      const ny = y + DIRS[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (dist[j] !== -1 || !passable(j)) continue;
      dist[j] = d;
      queue[tail++] = j;
    }
  }
  return dist;
}

/**
 * Prochaine case en descendant le champ de distances (−1 si aucune).
 * @param {Int16Array} dist
 * @param {number} w
 * @param {number} h
 * @param {number} i case courante
 */
export function nextStep(dist, w, h, i) {
  const d = dist[i];
  if (d <= 0) return -1;
  const x = i % w;
  const y = (i / w) | 0;
  for (let k = 0; k < 4; k++) {
    const nx = x + DIRS[k][0];
    const ny = y + DIRS[k][1];
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const j = ny * w + nx;
    if (dist[j] === d - 1) return j;
  }
  return -1;
}

/**
 * Chemin complet (liste d'indices, départ inclus) en suivant le champ jusqu'à une case de distance 0.
 * @returns {number[]} vide si inaccessible
 */
export function pathFrom(dist, w, h, start) {
  if (start < 0 || dist[start] < 0) return [];
  const path = [start];
  let i = start;
  let guard = w * h + 1;
  while (dist[i] > 0 && guard-- > 0) {
    i = nextStep(dist, w, h, i);
    if (i < 0) return [];
    path.push(i);
  }
  return path;
}

/** Voisins (indices) d'une case dans la grille. */
export function neighbors(w, h, i) {
  const x = i % w;
  const y = (i / w) | 0;
  const out = [];
  for (let k = 0; k < 4; k++) {
    const nx = x + DIRS[k][0];
    const ny = y + DIRS[k][1];
    if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx);
  }
  return out;
}
