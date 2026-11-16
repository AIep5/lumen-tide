// Beam tracing: the light's whole journey, worked out from the mirrors as
// they stand right now. A beam leaves its source in a cardinal direction,
// runs straight until it meets a mirror (it turns 90 degrees), a crystal
// (it wakes it if the colours match, and carries on through) or the edge of
// the field (it ends in a spark). Two colours meeting on one mirror mix:
// the light that leaves that mirror turns violet. Nothing here draws or
// listens — it only returns the path, so the world, the renderer and the
// screenshot stager all read the same truth.
import { BEAM_GRACE, CRYSTAL_RADIUS, FIELD, MIRROR_HALF } from './config.js';

/** What a 45-degree mirror does to a beam arriving from each direction. */
const REFLECT = {
  '/': {
    '1,0': [0, -1],
    '-1,0': [0, 1],
    '0,-1': [1, 0],
    '0,1': [-1, 0],
  },
  '\\': {
    '1,0': [0, 1],
    '-1,0': [0, -1],
    '0,-1': [-1, 0],
    '0,1': [1, 0],
  },
};

const DIAGONAL = MIRROR_HALF / Math.SQRT2;

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

/**
 * Where a ray (origin + direction) meets a mirror segment, as the distance
 * along the ray — or null when it misses or the mirror sits behind the ray.
 */
function rayMirrorHit(ox, oy, dx, dy, mirror) {
  const half = DIAGONAL;
  const ax = mirror.orientation === '/' ? mirror.x - half : mirror.x - half;
  const ay = mirror.orientation === '/' ? mirror.y + half : mirror.y - half;
  const bx = mirror.orientation === '/' ? mirror.x + half : mirror.x + half;
  const by = mirror.orientation === '/' ? mirror.y - half : mirror.y + half;
  const sx = bx - ax;
  const sy = by - ay;
  const denom = cross(dx, dy, sx, sy);
  if (Math.abs(denom) < 1e-9) return null;
  const t = cross(ax - ox, ay - oy, sx, sy) / denom;
  const u = cross(ax - ox, ay - oy, dx, dy) / denom;
  if (t <= 0.01 || u < 0 || u > 1) return null;
  return { t, x: ox + dx * t, y: oy + dy * t };
}

/** Distance from a point to a segment (0 when the point is on the segment). */
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let along = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  along = Math.max(0, Math.min(1, along));
  const cx = x1 + along * dx;
  const cy = y1 + along * dy;
  return Math.hypot(px - cx, py - cy);
}

/** How far a ray travels before it leaves the field (the field's walls end it). */
function rayEdgeDistance(ox, oy, dx, dy) {
  let best = Infinity;
  if (dx > 0) best = Math.min(best, (FIELD.width - ox) / dx);
  else if (dx < 0) best = Math.min(best, (0 - ox) / dx);
  if (dy > 0) best = Math.min(best, (FIELD.height - oy) / dy);
  else if (dy < 0) best = Math.min(best, (0 - oy) / dy);
  return best;
}

/**
 * Trace every source's beam through the mirrors as they stand. `mirrors` are
 * the level's mirrors with their current (drifted) positions and orientations;
 * `sources` and `crystals` come from the level. Returns the drawn segments,
 * which crystals each colour woke, and which mirrors mixed two colours.
 */
export function traceBeams(mirrors, sources, crystals) {
  const segments = [];
  const lit = new Map();
  const mixed = new Set();
  const amberTouched = new Set();
  const MAX_BOUNCES = 24;

  for (const source of sources) {
    let x = source.x;
    let y = source.y;
    let dx = source.dx;
    let dy = source.dy;
    let colour = source.colour;
    const visited = new Set();

    for (let bounce = 0; bounce < MAX_BOUNCES; bounce += 1) {
      let nearest = null;
      let nearestMirror = -1;
      for (let i = 0; i < mirrors.length; i += 1) {
        const hit = rayMirrorHit(x, y, dx, dy, mirrors[i]);
        if (hit !== null && (nearest === null || hit.t < nearest.t)) {
          nearest = hit;
          nearestMirror = i;
        }
      }
      const edge = rayEdgeDistance(x, y, dx, dy);
      const end = nearest !== null && nearest.t < edge ? nearest.t : edge;
      const x2 = x + dx * end;
      const y2 = y + dy * end;
      segments.push({ x1: x, y1: y, x2, y2, colour });
      for (let i = 0; i < crystals.length; i += 1) {
        const crystal = crystals[i];
        if (crystal.colour !== colour) continue;
        if (distanceToSegment(crystal.x, crystal.y, x, y, x2, y2) < CRYSTAL_RADIUS + BEAM_GRACE) {
          lit.set(i, colour);
        }
      }
      if (nearest === null || nearest.t >= edge) break;
      const mirror = mirrors[nearestMirror];
      const key = `${nearestMirror}:${dx},${dy}`;
      if (visited.has(key)) break;
      visited.add(key);
      if (colour === 'azure' && amberTouched.has(nearestMirror)) {
        colour = 'violet';
        mixed.add(nearestMirror);
      }
      if (colour === 'amber') amberTouched.add(nearestMirror);
      const turned = REFLECT[mirror.orientation][`${dx},${dy}`];
      x = nearest.x + turned[0] * 0.5;
      y = nearest.y + turned[1] * 0.5;
      dx = turned[0];
      dy = turned[1];
    }
  }
  return { segments, lit, mixed };
}
