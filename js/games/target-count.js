import { randInt, shuffle } from "../lib/random.js";
import { createTileGrid } from "../lib/tile-grid.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export const instructionsHtml = `
  <strong>Target Count</strong> — Keep track of one target tile during the flash stream, then choose how
  many times it appeared.`;

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
    const steps = randInt(8 + difficulty * 2, 10 + difficulty * 3);
    const onMs = Math.max(120, 430 - difficulty * 45);
    const offMs = Math.max(55, 170 - difficulty * 16);

    const target = randInt(0, n - 1);
    const sequence = [...Array(steps)].map(() => randInt(0, n - 1));
    let count = 0;
    for (const x of sequence) if (x === target) count++;
    if (count === 0) {
      const forced = randInt(0, steps - 1);
      sequence[forced] = target;
      count = 1;
    }

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize the target tile.";
    root.appendChild(phase);

    const wrap = document.createElement("div");
    root.appendChild(wrap);
    const { tiles } = createTileGrid(wrap, size, { interactive: false });

    tiles[target].classList.add("selected");
    await sleep(900);
    if (!alive) return;
    tiles[target].classList.remove("selected");

    phase.textContent = "Count target appearances in the stream…";

    for (const idx of sequence) {
      if (!alive) return;
      tiles[idx].classList.add("highlight", "flash");
      if (idx === target) tiles[idx].classList.add("selected");
      await sleep(onMs);
      tiles[idx].classList.remove("highlight", "flash", "selected");
      await sleep(offMs);
    }

    if (!alive) return;

    phase.textContent = "How many times did the target tile appear?";
    const choicesWrap = document.createElement("div");
    choicesWrap.className = "instructions-actions";
    root.appendChild(choicesWrap);

    const deltas = [-1, 0, 1, 2];
    const choices = shuffle(
      deltas.map((d) => clamp(count + d, 1, Math.max(2, steps - 1))),
    ).filter((v, i, arr) => arr.indexOf(v) === i);

    while (choices.length < 4) {
      choices.push(randInt(1, Math.max(2, steps - 1)));
      const uniq = [...new Set(choices)];
      choices.length = 0;
      choices.push(...uniq);
    }
    const finalChoices = shuffle(choices.slice(0, 4));

    let answered = false;

    const finish = (guess) => {
      if (answered) return;
      answered = true;
      const correct = guess === count;
      const pts = correct ? 75 + difficulty * 14 + steps * 3 : 0;
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
        correct ? "Count locked." : "Count miss.",
        `${correct ? `+${pts} points.` : ""} Correct count: ${count}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    for (const c of finalChoices) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn-primary";
      b.textContent = String(c);
      b.addEventListener("click", () => finish(c));
      choicesWrap.appendChild(b);
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
