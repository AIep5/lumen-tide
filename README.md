# lumen-tide

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/AIep5/lumen-tide/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/AIep5/lumen-tide/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lumen Tide** — a calm light-bending puzzle. You are the keeper of a lighthouse on a night sea: bend beams of coloured light through drifting mirrors to wake the sleeping crystals before the tide comes in. Click a mirror to turn it; amber and azure meeting on one mirror turn violet, and violet crystals only wake to mixed light. Three levels, a draining tide timer, and a score for every crystal woken — plus a chain bonus when one beam wakes two.

The twist is the tide itself: the mirrors drift as you play, so a solved path unsticks itself and you re-aim while the beam is live. The whole game is vanilla JavaScript on Canvas 2D with WebAudio synth sounds — no libraries, no network, no assets.

## How to play

- **Click a mirror** to turn it 45°. **← →** choose a mirror, **Space** turns the chosen one.
- Wake every crystal in the level before the tide timer empties.
- **R** restarts the level, **P** pauses.

## Run it

```sh
# Play it locally (any static server works — the game is plain files under game/)
python3 -m http.server 8080 --directory game
# then open http://localhost:8080

# Hand it in exactly as the grader does (writes dossier.json beside the game)
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
