import { createTileGrid } from "../lib/tile-grid.js";
import { randInt } from "../lib/random.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instructionsHtml = `
  <strong>Reverse Echo</strong> — Tiles flash in order. Tap them back in <em>reverse</em> order.`;

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
    const onMs = Math.max(130, 600 - difficulty * 85);
    const offMs = Math.max(55, 230 - difficulty * 33);

    /** @type {number[]} */
    const sequence = [];
    for (let i = 0; i < seqLen; i++) sequence.push(randInt(0, n - 1));
    const reversed = [...sequence].reverse();

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

    phase.textContent = "Your turn — reverse it.";

    for (const t of tiles) {
      t.disabled = false;
      t.classList.add("interactive");
    }

    let step = 0;
    let done = false;

    const onClick = async (i) => {
      if (done) return;
      const btn = tiles[i];
      btn.classList.add("flash");
      window.setTimeout(() => btn.classList.remove("flash"), 180);

      const expected = reversed[step];
      if (i !== expected) {
        done = true;
        btn.classList.add("mark-wrong");
        tiles[expected].classList.add("highlight");
        for (const t of tiles) t.disabled = true;
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
          "Broken reverse.",
          `Expected cell ${expected + 1} at reverse step ${step + 1}/${reversed.length}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
        return;
      }

      btn.classList.add("selected");
      step += 1;
      if (step < reversed.length) return;

      done = true;
      for (const t of tiles) t.disabled = true;
      const pts = 80 + reversed.length * 13 + difficulty * 10;
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
        "Reverse perfect.",
        `+${pts} points. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    for (let i = 0; i < tiles.length; i++) {
      const idx = i;
      tiles[idx].addEventListener("click", () => {
        void onClick(idx);
      });
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
