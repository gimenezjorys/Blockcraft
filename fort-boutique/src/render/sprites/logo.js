// Fort Boutique — logo : enseigne en bois crénelée, lettrage sticker, deux yeux (G20.7).

/** Corps de l'enseigne + 4 créneaux (dessinés deux fois : contour puis remplissage = union propre). */
function signShapes() {
  const merlons = [34, 106, 180, 252].map((x) => `<rect x="${x}" y="34" width="34" height="44" rx="5"/>`).join('');
  return `${merlons}<rect x="20" y="62" width="280" height="150" rx="20"/>`;
}

/**
 * @param {{ eyesOpen?: boolean, animate?: boolean, title?: string }} [opts]
 * @returns {string} SVG inline
 */
export function logoSvg({ animate = true, title = 'Fort Boutique' } = {}) {
  const words = title.split(' ');
  const l1 = words[0] || '';
  const l2 = words.slice(1).join(' ');
  const lid = animate ? ' class="lid"' : ' class="lid open"';
  const eye = (cx) => `
    <g class="eye">
      <ellipse cx="${cx}" cy="94" rx="14" ry="16" fill="#fff" stroke="#2B1A33" stroke-width="4"/>
      <circle class="pupil" cx="${cx + 2}" cy="97" r="7" fill="#2B1A33"/>
      <circle cx="${cx + 5}" cy="92" r="2.5" fill="#fff"/>
      <rect${lid} x="${cx - 17}" y="76" width="34" height="36" rx="12" fill="#B86B3C" stroke="#2B1A33" stroke-width="4"/>
    </g>`;
  return `<svg class="logo" viewBox="0 0 320 236" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
  <ellipse cx="160" cy="226" rx="120" ry="8" fill="#2B1A33" opacity=".25"/>
  <g fill="#2B1A33" stroke="#2B1A33" stroke-width="12" stroke-linejoin="round">${signShapes()}</g>
  <g fill="#B86B3C">${signShapes()}</g>
  <path d="M30 128 H292 M30 176 H292" stroke="#8A4A26" stroke-width="4" stroke-linecap="round"/>
  ${eye(132)}${eye(188)}
  <text x="160" y="152" text-anchor="middle" class="logo-text" font-size="40">${l1}</text>
  <text x="160" y="202" text-anchor="middle" class="logo-text" font-size="44">${l2}</text>
</svg>`;
}

/** Doigt animé qui tape (écran titre, G19 0:00). */
export function fingerSvg() {
  return `<svg class="finger" viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle class="ripple" cx="26" cy="12" r="10" fill="none" stroke="#F2F6EE" stroke-width="3"/>
  <g class="hand">
    <path d="M20 14 a6 6 0 0 1 12 0 v24 l4 -3 a6 6 0 0 1 8 1 l2 3 a6 6 0 0 1 8 2 l1 2 a6 6 0 0 1 7 4 v16 a16 16 0 0 1 -16 16 H34 a14 14 0 0 1 -11 -6 L10 54 a6 6 0 0 1 9 -8 l1 1z"
      fill="#F2F6EE" stroke="#2B1A33" stroke-width="3.5" stroke-linejoin="round"/>
  </g>
</svg>`;
}
