// The game's rules and state, with no drawing and no browser in it: the
// mirrors and their drift, the tide timer, the crystals and whether they are
// awake, the score, and the three levels. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react — chime, show
// a panel, move to the next level — without the world knowing about screens
// or sound. A crystal, once woken, stays awake: the tide only ever takes
// time, never light.
import { LEVELS, SCORE, STEP } from './config.js';
import { traceBeams } from './beam.js';

export const EVENT_CRYSTAL = 1;
export const EVENT_LEVEL = 2;
export const EVENT_OVER = 4;

/** Seconds the "level clear" banner lingers before the next level begins. */
export const CLEAR_PAUSE = 2.2;

function driftOffset(mirror, time) {
  if (mirror.amp === 0) return 0;
  return mirror.amp * Math.sin((2 * Math.PI * time) / mirror.period + mirror.phase);
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    time: 0,
    timer: 0,
    score: 0,
    best: 0,
    mirrors: [],
    crystals: [],
    lit: [],
    segments: [],
    mixed: new Set(),
    litCount: 0,
    totalCrystals: 0,
    clearTimer: 0,
    toast: 0,
    lastBonus: 0,
    scoreAtLevelStart: 0,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.scoreAtLevelStart = state.score;
    state.time = 0;
    state.timer = level.timer;
    state.clearTimer = 0;
    state.toast = 3;
    state.mirrors = level.mirrors.map((m) => ({
      x: m.x,
      y: m.y,
      baseX: m.x,
      baseY: m.y,
      orientation: m.start,
      axis: m.axis,
      amp: m.amp,
      period: m.period,
      phase: m.phase,
    }));
    state.crystals = level.crystals.map((c) => ({ x: c.x, y: c.y, colour: c.colour, litAt: -1 }));
    state.lit = state.crystals.map(() => false);
    state.litCount = 0;
    state.totalCrystals = level.crystals.length;
    refreshBeams();
  }

  /** Where each mirror stands right now, drift included. */
  function placedMirrors() {
    return state.mirrors.map((m) => {
      const shift = driftOffset(m, state.time);
      return {
        x: m.axis === 'x' ? m.baseX + shift : m.baseX,
        y: m.axis === 'y' ? m.baseY + shift : m.baseY,
        orientation: m.orientation,
      };
    });
  }

  function refreshBeams() {
    const level = LEVELS[state.levelIndex];
    const traced = traceBeams(placedMirrors(), level.sources, state.crystals);
    state.segments = traced.segments;
    state.mixed = traced.mixed;
    return traced;
  }

  function turnMirror(index) {
    const mirror = state.mirrors[index];
    if (!mirror) return false;
    mirror.orientation = mirror.orientation === '/' ? '\\' : '/';
    refreshBeams();
    return true;
  }

  function setMirrors(orientations) {
    state.mirrors.forEach((mirror, i) => {
      if (orientations[i]) mirror.orientation = orientations[i];
    });
    refreshBeams();
  }

  /** One fixed step of live play. Returns EVENT_* flags. */
  function step(dt) {
    let events = 0;
    state.time += dt;
    if (state.toast > 0) state.toast = Math.max(0, state.toast - dt);
    if (state.clearTimer > 0) {
      state.clearTimer = Math.max(0, state.clearTimer - dt);
      return events;
    }
    state.timer = Math.max(0, state.timer - dt);
    const traced = refreshBeams();
    let fresh = 0;
    for (const [index] of traced.lit) {
      if (!state.lit[index]) {
        state.lit[index] = true;
        state.crystals[index].litAt = state.time;
        state.litCount += 1;
        fresh += 1;
        events |= EVENT_CRYSTAL;
      }
    }
    if (fresh > 0) {
      state.score += fresh * SCORE.crystal + Math.max(0, fresh - 1) * SCORE.chain;
    }
    if (state.litCount === state.totalCrystals) {
      state.lastBonus = Math.ceil(state.timer) * SCORE.timePerSecond;
      state.score += state.lastBonus;
      state.clearTimer = CLEAR_PAUSE;
      events |= EVENT_LEVEL;
      return events;
    }
    if (state.timer <= 0) {
      events |= EVENT_OVER;
    }
    return events;
  }

  /** The title screen's backdrop: the world runs, the beams sweep, nothing scores. */
  function idleStep(dt) {
    state.time += dt;
    refreshBeams();
  }

  function nextLevel() {
    if (state.levelIndex + 1 < LEVELS.length) {
      loadLevel(state.levelIndex + 1);
      return true;
    }
    return false;
  }

  function restartLevel() {
    // A failed attempt banks nothing: the points its crystals earned go back.
    state.score = state.scoreAtLevelStart;
    loadLevel(state.levelIndex);
  }

  function restartGame() {
    state.score = 0;
    loadLevel(0);
  }

  loadLevel(0);
  return {
    state,
    loadLevel,
    turnMirror,
    setMirrors,
    step,
    idleStep,
    nextLevel,
    restartLevel,
    restartGame,
    placedMirrors,
  };
}
