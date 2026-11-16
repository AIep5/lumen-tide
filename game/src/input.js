// Keyboard and pointer input. One-shot presses (start, restart, pause, pick
// the next mirror) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. A click on
// a mirror turns it at once; a click anywhere else counts as "confirm"
// (start the game, move on, play again). Held keys are not needed here —
// this is a game of aiming, not of steering.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_NEXT = 8;
export const ACTION_PREV = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const NEXT = new Set(['ArrowRight', 'ArrowDown', 'KeyD', 'Tab']);
const PREV = new Set(['ArrowLeft', 'ArrowUp', 'KeyA']);

/** How close, in playfield pixels, a click must land to a mirror to turn it. */
export const CLICK_RADIUS = 44;

export function createInput(canvas, pickMirror) {
  let actions = 0;
  let clickedMirror = -1;
  let pointerDown = false;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (NEXT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_NEXT;
    } else if (PREV.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PREV;
    } else return;
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    clickedMirror = pickMirror(event.clientX, event.clientY);
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The mirror a click just turned, or -1 when the click was elsewhere. */
    takeClick() {
      const taken = clickedMirror;
      clickedMirror = -1;
      return taken;
    },
    /** True when the pointer went down since the last call, mirror or not. */
    takePointer() {
      const taken = pointerDown;
      pointerDown = false;
      return taken;
    },
  };
}
