// Lumen Tide — every tuning number, colour and level layout in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, seaY: 640 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** A beam is a straight run of coloured light; it only ever travels
 *  horizontally or vertically, because every mirror sits at 45 degrees. */
export const COLOUR = {
  amber: '#f2b23e',
  azure: '#5ec8f2',
  violet: '#b678f0',
};

/** Points for waking a crystal, for each extra crystal woken by the same
 *  beam in one step (a chain), and per second left on the tide timer. */
export const SCORE = { crystal: 100, chain: 25, timePerSecond: 5 };

export const CRYSTAL_RADIUS = 24;
export const MIRROR_HALF = 32;
/** How close a beam must pass to a crystal's centre to wake it. */
export const BEAM_GRACE = 3;

export const PALETTE = {
  skyTop: '#07222e',
  skyBottom: '#04141d',
  sea: '#0a2e3a',
  seaLine: '#155263',
  star: '#cfe8ef',
  rock: '#1c2b33',
  tower: '#3a4a5a',
  towerEdge: '#5a7086',
  lampGlow: '#ffd98a',
  mirrorWood: '#8a6b48',
  mirrorFace: '#dceeff',
  mirrorFaceDim: '#9db8cc',
  crystalDim: '#33505e',
  panel: '#0e2733',
  panelEdge: '#2a5566',
  text: '#eef6f8',
  muted: '#93b3bd',
  gold: '#f2c94c',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-tide.best';

/**
 * A mirror: where it sits, which diagonal it starts on ('/' or '\'), and how
 * it drifts with the tide. It always slides ALONG the beam that feeds it, so
 * the beam can never lose it entirely — the drift shifts the outgoing beam
 * sideways, and a crystal's glow-radius forgives the shift. `amp` is the drift
 * in pixels, `period` the seconds for one full sway, `phase` staggers mirrors.
 */
function mirror(x, y, start, axis, amp, period, phase) {
  return { x, y, start, axis, amp, period, phase };
}

function crystal(x, y, colour) {
  return { x, y, colour };
}

function source(x, y, dx, dy, colour) {
  return { x, y, dx, dy, colour };
}

/**
 * The three levels, hand-tuned so a solution exists at every moment of the
 * tide (verified by brute force over orientations and drift phases — see
 * tools/solve-check.mjs). `solved` is the orientation each mirror needs;
 * `start` is the orientation it begins in, always one click away from wrong.
 */
export const LEVELS = [
  {
    name: 'First Light',
    timer: 75,
    hint: 'Click a mirror to turn it. Wake every crystal before the tide.',
    sources: [source(80, 320, 1, 0, 'amber')],
    mirrors: [
      mirror(400, 320, '/', 'x', 0, 10, 0),
      mirror(400, 640, '/', 'y', 14, 12, 0),
    ],
    solved: ['\\', '\\'],
    crystals: [crystal(400, 500, 'amber'), crystal(900, 640, 'amber')],
  },
  {
    name: 'Two Tides',
    timer: 100,
    hint: 'Amber and azure must meet on one mirror — the light leaving it turns violet.',
    sources: [source(80, 320, 1, 0, 'amber'), source(880, 40, 0, 1, 'azure')],
    mirrors: [
      mirror(400, 320, '/', 'x', 16, 10, 0),
      mirror(400, 640, '/', 'y', 16, 10, 2.1),
      mirror(880, 320, '\\', 'y', 16, 10, 4.2),
    ],
    solved: ['\\', '\\', '/'],
    crystals: [
      crystal(900, 640, 'amber'),
      crystal(600, 320, 'azure'),
      crystal(400, 160, 'violet'),
    ],
  },
  {
    name: 'The Violet Hour',
    timer: 120,
    hint: 'Five mirrors, two violet crystals, and a faster tide. Steady hands.',
    sources: [source(80, 320, 1, 0, 'amber'), source(880, 40, 0, 1, 'azure')],
    mirrors: [
      mirror(400, 320, '/', 'x', 18, 7, 0),
      mirror(400, 640, '/', 'y', 18, 7, 1.4),
      mirror(880, 320, '\\', 'y', 18, 7, 2.8),
      mirror(880, 640, '\\', 'x', 18, 7, 4.2),
      mirror(400, 160, '\\', 'y', 18, 7, 5.6),
    ],
    solved: ['\\', '\\', '/', '/', '/'],
    crystals: [
      crystal(400, 500, 'amber'),
      crystal(880, 180, 'azure'),
      crystal(550, 160, 'violet'),
      crystal(760, 160, 'violet'),
    ],
  },
];
