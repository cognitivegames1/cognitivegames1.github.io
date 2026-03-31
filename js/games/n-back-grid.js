import { createTileGrid } from "../lib/tile-grid.js";
import { randInt } from "../lib/random.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomOther(max, exclude) {
  let n = randInt(0, max);
  while (n === exclude) n = randInt(0, max);
  return n;
}

export const instructionsHtml = `
  <strong>N-Back Grid</strong> — Watch the tile stream. Then tap the tile that repeated after
  <em>N</em> steps.`;

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
    const nTiles = size * size;
    const nBack = difficulty <= 2 ? 1 : difficulty <= 4 ? 2 : 3;
    const seqLen = randInt(7 + nBack + difficulty, 10 + nBack + difficulty);
    const onMs = Math.max(135, 680 - difficulty * 100);
    const offMs = Math.max(60, 280 - difficulty * 38);

    const pairFrom = randInt(0, seqLen - nBack - 1);
    const pairTo = pairFrom + nBack;
    const repeatedTile = randInt(0, nTiles - 1);

    const sequence = [...Array(seqLen)].map(() => randInt(0, nTiles - 1));
    sequence[pairFrom] = repeatedTile;
    sequence[pairTo] = repeatedTile;
    for (let i = 0; i < sequence.length; i++) {
      if (i === pairFrom || i === pairTo) continue;
      if (sequence[i] === repeatedTile) {
        sequence[i] = randomOther(nTiles - 1, repeatedTile);
      }
    }

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Watch the stream…";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    root.appendChild(wrap);

    const { tiles } = createTileGrid(wrap, size, { interactive: false });

    for (let i = 0; i < sequence.length; i++) {
      if (!alive) return;
      phase.textContent = `Watch the stream… ${i + 1}/${sequence.length}`;
      const idx = sequence[i];
      tiles[idx].classList.add("highlight", "flash");
      await sleep(onMs);
      tiles[idx].classList.remove("highlight", "flash");
      await sleep(offMs);
    }

    if (!alive) return;

    phase.innerHTML = `Tap the tile repeated at <strong>${nBack}-back</strong>.`;

    for (const t of tiles) {
      t.disabled = false;
      t.classList.add("interactive");
    }

    let answered = false;

    const onTap = async (idx) => {
      if (answered) return;
      answered = true;
      const correct = idx === repeatedTile;
      if (correct) {
        tiles[idx].classList.add("selected");
      } else {
        tiles[idx].classList.add("mark-wrong");
        tiles[repeatedTile].classList.add("highlight");
      }
      for (const t of tiles) t.disabled = true;

      await sleep(260);
      if (!alive) return;

      const pts = correct ? 90 + difficulty * 16 + seqLen * 4 : 0;
      const progress = shell.recordRound(correct, pts);
      shell.stopTimer();

      if (progress.done) {
        shell.showResult(
          "Session complete.",
          `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
        );
        return;
      }

      shell.showResult(
        correct ? "N-back locked." : "N-back miss.",
        `${correct
          ? `+${pts} points. Correct tile was ${repeatedTile + 1}.`
          : `Correct tile was ${repeatedTile + 1}.`} Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    for (let i = 0; i < tiles.length; i++) {
      const idx = i;
      tiles[idx].addEventListener("click", () => {
        void onTap(idx);
      });
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
