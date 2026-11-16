// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the night colour. Everything is drawn from the state — the
// beams as they were traced this step, the mirrors where the tide has
// carried them, the crystals as they woke — so a screenshot is always a
// faithful frame of a real game.
import { COLOUR, FIELD, FONT, LEVELS, MIRROR_HALF, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const PANEL = { width: 660, top: 150, line: 34, bottom: 76 };

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function createRenderer(canvas, random) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const stars = [];
  for (let i = 0; i < 80; i += 1) {
    stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.seaY * 0.8,
      r: 0.6 + random() * 1.4,
      phase: random() * Math.PI * 2,
    });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawSky(time) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * 0.7 + star.phase));
      context.globalAlpha = twinkle * 0.85;
      context.fillStyle = PALETTE.star;
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // A low moon, out of the beam's way, top right.
    const moon = context.createRadialGradient(1120, 110, 4, 1120, 110, 90);
    moon.addColorStop(0, 'rgba(230, 240, 244, 0.5)');
    moon.addColorStop(1, 'rgba(230, 240, 244, 0)');
    context.fillStyle = moon;
    context.fillRect(1020, 10, 200, 200);
    context.fillStyle = '#e6f0f4';
    context.beginPath();
    context.arc(1120, 110, 26, 0, Math.PI * 2);
    context.fill();
  }

  function drawSea(time) {
    context.fillStyle = PALETTE.sea;
    context.fillRect(0, FIELD.seaY, FIELD.width, FIELD.height - FIELD.seaY);
    context.strokeStyle = PALETTE.seaLine;
    context.lineWidth = 2;
    for (let row = 0; row < 3; row += 1) {
      context.beginPath();
      const baseY = FIELD.seaY + 18 + row * 22;
      for (let x = 0; x <= FIELD.width; x += 16) {
        const y = baseY + Math.sin(x * 0.012 + time * 1.1 + row * 2.1) * 4;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.globalAlpha = 0.7 - row * 0.18;
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function drawLighthouse() {
    // Rocks at the foot, then the tower, then the lamp room holding the orb
    // the amber beam leaves from (the source point, 80, 320).
    context.fillStyle = PALETTE.rock;
    context.beginPath();
    context.moveTo(20, FIELD.seaY);
    context.lineTo(52, 600);
    context.lineTo(88, 622);
    context.lineTo(130, 596);
    context.lineTo(150, FIELD.seaY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.tower;
    context.beginPath();
    context.moveTo(52, 640);
    context.lineTo(60, 344);
    context.lineTo(100, 344);
    context.lineTo(108, 640);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.towerEdge;
    context.fillRect(60, 344, 6, 296);
    context.fillStyle = '#2c3a48';
    context.fillRect(56, 300, 48, 44);
    const glow = context.createRadialGradient(80, 320, 2, 80, 320, 74);
    glow.addColorStop(0, 'rgba(255, 217, 138, 0.85)');
    glow.addColorStop(1, 'rgba(255, 217, 138, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 240, 170, 160);
    context.fillStyle = PALETTE.lampGlow;
    context.beginPath();
    context.arc(80, 320, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff6dd';
    context.beginPath();
    context.arc(80, 320, 6, 0, Math.PI * 2);
    context.fill();
  }

  function drawLantern() {
    // The azure tide lantern hangs from the top edge; its beam falls from it.
    context.strokeStyle = '#3a5a66';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(880, 0);
    context.lineTo(880, 26);
    context.stroke();
    const glow = context.createRadialGradient(880, 40, 2, 880, 40, 56);
    glow.addColorStop(0, 'rgba(94, 200, 242, 0.8)');
    glow.addColorStop(1, 'rgba(94, 200, 242, 0)');
    context.fillStyle = glow;
    context.fillRect(820, 0, 120, 100);
    context.fillStyle = COLOUR.azure;
    context.beginPath();
    context.arc(880, 40, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#dff4ff';
    context.beginPath();
    context.arc(880, 40, 5, 0, Math.PI * 2);
    context.fill();
  }

  function drawBeams(state) {
    for (const segment of state.segments) {
      const [r, g, b] = hexToRgb(COLOUR[segment.colour]);
      context.lineCap = 'round';
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
      context.lineWidth = 13;
      context.beginPath();
      context.moveTo(segment.x1, segment.y1);
      context.lineTo(segment.x2, segment.y2);
      context.stroke();
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(segment.x1, segment.y1);
      context.lineTo(segment.x2, segment.y2);
      context.stroke();
      context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(segment.x1, segment.y1);
      context.lineTo(segment.x2, segment.y2);
      context.stroke();
    }
    // A spark where a beam dies against the field's edge.
    for (const segment of state.segments) {
      const [r, g, b] = hexToRgb(COLOUR[segment.colour]);
      const atEdge =
        segment.x2 <= 1 || segment.x2 >= FIELD.width - 1 || segment.y2 <= 1 || segment.y2 >= FIELD.height - 1;
      if (!atEdge) continue;
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      context.beginPath();
      context.arc(segment.x2, segment.y2, 5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawMirror(mirror, index, state, view2) {
    const mixed = state.mixed.has(index);
    context.save();
    context.translate(mirror.x, mirror.y);
    context.rotate(mirror.orientation === '/' ? -Math.PI / 4 : Math.PI / 4);
    if (mixed) {
      context.shadowColor = COLOUR.violet;
      context.shadowBlur = 22;
    } else if (view2.hover === index || view2.selected === index) {
      context.shadowColor = PALETTE.gold;
      context.shadowBlur = 14;
    }
    context.fillStyle = PALETTE.mirrorWood;
    roundRect(-MIRROR_HALF - 4, -8, (MIRROR_HALF + 4) * 2, 16, 8);
    context.fill();
    context.shadowBlur = 0;
    const face = context.createLinearGradient(0, -6, 0, 6);
    face.addColorStop(0, '#ffffff');
    face.addColorStop(0.5, mixed ? '#d9b8ff' : PALETTE.mirrorFace);
    face.addColorStop(1, mixed ? '#8a5cf0' : PALETTE.mirrorFaceDim);
    context.fillStyle = face;
    roundRect(-MIRROR_HALF, -5, MIRROR_HALF * 2, 10, 5);
    context.fill();
    context.restore();
    context.fillStyle = '#2c2118';
    context.beginPath();
    context.arc(mirror.x, mirror.y, 3, 0, Math.PI * 2);
    context.fill();
    if (view2.selected === index) {
      context.strokeStyle = PALETTE.gold;
      context.lineWidth = 2;
      context.setLineDash([6, 5]);
      context.beginPath();
      context.arc(mirror.x, mirror.y, MIRROR_HALF + 12, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    if (view2.hover === index) {
      context.strokeStyle = 'rgba(242, 201, 76, 0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(mirror.x, mirror.y, MIRROR_HALF + 8, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawCrystal(crystal, lit, time) {
    const [r, g, b] = hexToRgb(COLOUR[crystal.colour]);
    const size = 24;
    context.save();
    context.translate(crystal.x, crystal.y);
    if (lit) {
      const pulse = 0.75 + 0.25 * Math.sin(time * 3 + crystal.x);
      context.shadowColor = COLOUR[crystal.colour];
      context.shadowBlur = 26 * pulse;
      context.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
      context.beginPath();
      context.moveTo(0, -size);
      context.lineTo(size * 0.72, 0);
      context.lineTo(0, size);
      context.lineTo(-size * 0.72, 0);
      context.closePath();
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.moveTo(0, -size * 0.45);
      context.lineTo(size * 0.32, 0);
      context.lineTo(0, size * 0.45);
      context.lineTo(-size * 0.32, 0);
      context.closePath();
      context.fill();
      context.strokeStyle = `rgba(255, 255, 255, ${0.5 * pulse})`;
      context.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        const angle = (i * Math.PI) / 2 + time * 0.4;
        context.beginPath();
        context.moveTo(Math.cos(angle) * (size + 6), Math.sin(angle) * (size + 6));
        context.lineTo(Math.cos(angle) * (size + 16), Math.sin(angle) * (size + 16));
        context.stroke();
      }
    } else {
      context.globalAlpha = 0.4;
      context.fillStyle = `rgb(${r}, ${g}, ${b})`;
      context.beginPath();
      context.moveTo(0, -size);
      context.lineTo(size * 0.72, 0);
      context.lineTo(0, size);
      context.lineTo(-size * 0.72, 0);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.arc(0, 0, size + 10, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    context.restore();
  }

  function drawHud(state, best) {
    const level = LEVELS[state.levelIndex];
    context.textBaseline = 'top';
    text(`Level ${state.levelIndex + 1} · ${level.name}`, 24, 18, 24, PALETTE.text, 'left');
    const lit = state.crystals.filter((c, i) => state.lit[i]);
    const dots = state.crystals.map((c, i) => (state.lit[i] ? '◆' : '◇')).join(' ');
    text(`${dots}  ${state.litCount}/${state.totalCrystals}`, 24, 50, 22, PALETTE.muted, 'left');
    // Tide timer: a draining bar in the middle, red when the water is close.
    const barWidth = 320;
    const barX = (FIELD.width - barWidth) / 2;
    const fraction = Math.max(0, state.timer / level.timer);
    context.fillStyle = 'rgba(14, 39, 51, 0.85)';
    roundRect(barX - 6, 14, barWidth + 12, 26, 12);
    context.fill();
    context.fillStyle = fraction < 0.2 ? PALETTE.danger : COLOUR.azure;
    if (fraction > 0) {
      roundRect(barX, 20, barWidth * fraction, 14, 7);
      context.fill();
    }
    text(`${Math.ceil(state.timer)}s`, FIELD.width / 2, 44, 20, PALETTE.text, 'center');
    text(`Score ${state.score}`, FIELD.width - 24, 18, 24, PALETTE.text, 'right');
    text(`Best ${best}`, FIELD.width - 24, 50, 22, PALETTE.muted, 'right');
    text('Click a mirror to turn it · ← → choose · Space turn · R restart · P pause', FIELD.width / 2, FIELD.height - 28, 18, PALETTE.muted, 'center');
    if (state.toast > 0) {
      context.globalAlpha = Math.min(1, state.toast);
      text(level.name, FIELD.width / 2, 130, 44, PALETTE.text, 'center');
      text(LEVELS[state.levelIndex].hint, FIELD.width / 2, 182, 22, PALETTE.muted, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(4, 18, 25, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    roundRect(x, y, PANEL.width, height, 16);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 76, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  function draw(state, screen, view2) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.skyBottom;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state.time);
    drawSea(state.time);
    drawLighthouse();
    if (state.levelIndex > 0) drawLantern();
    drawBeams(state);
    const mirrors = view2.mirrors;
    for (let i = 0; i < mirrors.length; i += 1) drawMirror(mirrors[i], i, state, view2);
    for (let i = 0; i < state.crystals.length; i += 1) {
      drawCrystal(state.crystals[i], state.lit[i], state.time);
    }
    if (screen === SCREEN_TITLE) {
      const lines = [
        'Bend the light. Wake the crystals before the tide comes in.',
        'Click a mirror to turn it. Amber and azure meeting on one mirror turn violet.',
        `Best ${view2.best}`,
        '',
      ];
      drawPanel('LUMEN TIDE', lines, 'Press Space or click to begin');
      return;
    }
    drawHud(state, view2.best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The tide waits for you.'], 'Press P to resume');
    } else if (screen === SCREEN_CLEAR) {
      const lines = [
        `Crystals woken: ${state.totalCrystals}  ·  Time bonus: +${state.lastBonus}`,
        `Score ${state.score}`,
        '',
      ];
      drawPanel('Level Clear!', lines, 'Press Space for the next level');
    } else if (screen === SCREEN_WIN) {
      const lines = [
        `Every crystal is awake. The tide is lit.`,
        `Score ${state.score}   ·   Best ${Math.max(view2.best, state.score)}`,
        '',
      ];
      drawPanel('The Tide Is Lit!', lines, 'Press Space to play again');
    } else if (screen === SCREEN_LOSE) {
      const lines = [
        `The tide came in with ${state.totalCrystals - state.litCount} crystal${state.totalCrystals - state.litCount === 1 ? '' : 's'} still asleep.`,
        `Score ${state.score}`,
        '',
      ];
      drawPanel('The Tide Came In', lines, 'Press Space to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
