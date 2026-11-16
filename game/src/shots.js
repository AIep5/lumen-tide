// The screenshot scenes behind ?shot=start|play|mix|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, then
// stops on the frame the shot wants: the title over the first level, a
// half-solved first level with one crystal awake, the third level at the
// moment the mixed beam wakes its first violet crystal, and the last level
// won. The same seed always gives the same frame, because the drift, the
// timer and the beams all come from the same fixed steps.
import { LEVELS, STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const LIMIT_SECONDS = 40;

function advance(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP);
}

function violetIndex(world) {
  return world.state.crystals.findIndex((c) => c.colour === 'violet');
}

/** Flip one mirror's diagonal: '/' becomes '\' and back. */
function flipped(orientation) {
  return orientation === '/' ? '\\' : '/';
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any unknown name is the title scene.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    // Mid-play on the first level: the first mirror is turned, the first
    // crystal is awake, the second is still dark.
    world.loadLevel(0);
    const half = LEVELS[0].mirrors.map((m) => m.start);
    half[0] = LEVELS[0].solved[0];
    world.setMirrors(half);
    for (let i = 0; i < LIMIT_SECONDS / STEP && world.state.litCount < 1; i += 1) world.step(STEP);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'mix') {
    // The violet moment, on the third level: amber and azure are already
    // awake, and the last mirror is one turn away from mixing them.
    world.loadLevel(2);
    const almost = [...LEVELS[2].solved];
    almost[almost.length - 1] = flipped(almost[almost.length - 1]);
    world.setMirrors(almost);
    for (let i = 0; i < LIMIT_SECONDS / STEP && world.state.litCount < 2; i += 1) world.step(STEP);
    world.setMirrors(LEVELS[2].solved);
    const violet = violetIndex(world);
    for (let i = 0; i < LIMIT_SECONDS / STEP && !world.state.lit[violet]; i += 1) world.step(STEP);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    world.loadLevel(2);
    advance(world, 3);
    world.setMirrors(LEVELS[2].solved);
    for (let i = 0; i < LIMIT_SECONDS / STEP && world.state.clearTimer <= 0; i += 1) world.step(STEP);
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  world.loadLevel(0);
  for (let i = 0; i < 6 / STEP; i += 1) world.idleStep(STEP);
  return { screen: SCREEN_TITLE, best: 0 };
}
