// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between six screens: title,
// play, paused, level clear, win and lose. Space turns the chosen mirror
// while playing and moves on everywhere else; a click on a mirror turns it
// at once; R restarts the level; P pauses.
//
// ?seed=N fixes the drift and the stars. ?shot=start|play|mix|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CRYSTAL, EVENT_LEVEL, EVENT_OVER } from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_NEXT,
  ACTION_PAUSE,
  ACTION_PREV,
  ACTION_RESTART,
  CLICK_RADIUS,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_CLEAR,
  SCREEN_LOSE,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, createRandom(seed + 7));
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit.
  }
}

/** The mirror under a pointer position, in playfield pixels, or -1. */
function pickMirror(clientX, clientY) {
  const ratio = window.devicePixelRatio || 1;
  const view = renderer.view;
  const fx = (clientX * ratio - view.x) / view.scale;
  const fy = (clientY * ratio - view.y) / view.scale;
  const mirrors = world.placedMirrors();
  let best = -1;
  let bestDistance = CLICK_RADIUS;
  for (let i = 0; i < mirrors.length; i += 1) {
    const distance = Math.hypot(mirrors[i].x - fx, mirrors[i].y - fy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, {
      best: scene.best,
      selected: -1,
      hover: -1,
      mirrors: world.placedMirrors(),
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, pickMirror);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selected = 0;
  let hover = -1;
  let accumulator = 0;
  let last = performance.now();

  canvas.addEventListener('pointermove', (event) => {
    hover = screen === SCREEN_PLAY ? pickMirror(event.clientX, event.clientY) : -1;
  });
  canvas.addEventListener('pointerleave', () => {
    hover = -1;
  });

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.restartGame();
    selected = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wake every crystal before the tide comes in.');
  }

  function advanceFromClear() {
    if (world.nextLevel()) {
      selected = 0;
      screen = SCREEN_PLAY;
      announce(`Level ${world.state.levelIndex + 1}.`);
    } else {
      screen = SCREEN_WIN;
      audio.win();
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      announce(`You win. Score ${world.state.score}.`);
    }
  }

  function handleClick() {
    const pressed = input.takePointer();
    if (!pressed) return;
    const mirror = input.takeClick();
    audio.unlock();
    if (screen === SCREEN_PLAY) {
      // A click on a mirror turns it; a click on empty water does nothing.
      if (mirror >= 0) {
        audio.click();
        world.turnMirror(mirror);
        selected = mirror;
      }
      return;
    }
    if (screen === SCREEN_TITLE) startGame();
    else if (screen === SCREEN_CLEAR) advanceFromClear();
    else if (screen === SCREEN_WIN || screen === SCREEN_LOSE) startGame();
    else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_CLEAR) {
      if (actions & ACTION_CONFIRM) advanceFromClear();
      return;
    }
    if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_CONFIRM | ACTION_PAUSE)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    // Playing.
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_RESTART) {
      world.restartLevel();
      selected = 0;
      announce('Level restarted.');
      return;
    }
    if (actions & ACTION_NEXT) selected = (selected + 1) % world.state.mirrors.length;
    if (actions & ACTION_PREV) {
      selected = (selected - 1 + world.state.mirrors.length) % world.state.mirrors.length;
    }
    if (actions & ACTION_CONFIRM) {
      audio.click();
      world.turnMirror(selected);
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.idleStep(STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP);
    if (events & EVENT_CRYSTAL) audio.chime(world.state.litCount);
    if (events & EVENT_LEVEL) {
      audio.levelClear();
      screen = SCREEN_CLEAR;
      announce('Level clear.');
    } else if (events & EVENT_OVER) {
      audio.lose();
      screen = SCREEN_LOSE;
      announce('The tide came in.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleClick();
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, {
      best,
      selected: screen === SCREEN_PLAY ? selected : -1,
      hover,
      mirrors: world.placedMirrors(),
    });
  }

  // Leaving the tab pauses a running game rather than letting the tide run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Tide. Press Space or click to begin.');
  requestAnimationFrame(frame);
}

// A handle for the play-test harness (and for curious players in devtools).
window.__game = { world, seed };
if (shot) runShot(shot);
else runGame();
