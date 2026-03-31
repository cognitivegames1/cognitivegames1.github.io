import { createTileGrid } from "../lib/tile-grid.js";
import { randInt } from "../lib/random.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instructionsHtml = `
  <strong>Sequence Echo</strong> — Tiles flash in order. Repeat the same order by tapping the grid. One
  mistake ends the round.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  let alive = true;

  function teardown() {
    alive = false;
    root.innerHTML = "";
  }

  function reset() {
    teardown();
    shell.stopTimer();
    shell.resetTimerDisplay();
  }

  async function beginRound() {
    alive = true;
    shell.hideResult();
    root.innerHTML = "";

    const difficulty = shell.getDifficulty();
    const size = difficulty <= 2 ? 3 : 4;
    const n = size * size;
    const seqMin = Math.min(n, 2 + difficulty);
    const seqMax = Math.min(n, 4 + difficulty);
    const seqLen = randInt(seqMin, Math.max(seqMin, seqMax));
    const onMs = Math.max(130, 580 - difficulty * 85);
    const offMs = Math.max(55, 240 - difficulty * 34);
    /** @type {number[]} */
    const sequence = [];
    for (let i = 0; i < seqLen; i++) {
      sequence.push(randInt(0, n - 1));
    }

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Watch the sequence…";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    root.appendChild(wrap);

    const { tiles } = createTileGrid(wrap, size, { interactive: false });

    for (const idx of sequence) {
      if (!alive) return;
      tiles[idx].classList.add("highlight", "flash");
      await sleep(onMs);
      tiles[idx].classList.remove("highlight", "flash");
      await sleep(offMs);
    }

    if (!alive) return;

    phase.textContent = "Your turn — repeat the sequence.";

    for (const t of tiles) {
      t.disabled = false;
      t.classList.add("interactive");
    }

    let step = 0;
    let done = false;

    const onClick = async (i) => {
      if (done) return;
      const pressed = tiles[i];
      pressed.classList.add("flash");
      window.setTimeout(() => {
        pressed.classList.remove("flash");
      }, 180);

      const expected = sequence[step];
      if (i !== expected) {
        done = true;
        pressed.classList.add("mark-wrong");
        tiles[expected].classList.add("highlight");
        for (const t of tiles) {
          t.disabled = true;
        }
        await sleep(260);
        const progress = shell.recordRound(false, 0);
        shell.stopTimer();
        if (progress.done) {
          shell.showResult(
            "Session complete.",
            `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
          );
          return;
        }
        shell.showResult(
          "Broken chain.",
          `Next in the sequence was cell ${expected + 1} (step ${step + 1} of ${sequence.length}). Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
        return;
      }

      pressed.classList.add("selected");
      step++;
      if (step >= sequence.length) {
        done = true;
        for (const t of tiles) {
          t.disabled = true;
        }
        const pts = 70 + sequence.length * 12 + difficulty * 10;
        const progress = shell.recordRound(true, pts);
        shell.stopTimer();
        if (progress.done) {
          shell.showResult(
            "Session complete.",
            `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
          );
          return;
        }
        shell.showResult(
          "Perfect echo.",
          `+${pts} points for length ${sequence.length}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
      }
    };

    for (let i = 0; i < tiles.length; i++) {
      const idx = i;
      tiles[idx].addEventListener("click", () => onClick(idx));
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
