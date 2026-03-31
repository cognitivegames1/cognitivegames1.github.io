import { pick, pickN, shuffle } from "../lib/random.js";
import { FEEDBACK_REVEAL_MS, delay, disableControls } from "../lib/feedback.js";

const PALETTE = [
  { key: "red", label: "Red", hex: "#ef4444" },
  { key: "blue", label: "Blue", hex: "#3b82f6" },
  { key: "green", label: "Green", hex: "#22c55e" },
  { key: "yellow", label: "Yellow", hex: "#eab308" },
  { key: "purple", label: "Purple", hex: "#a855f7" },
  { key: "orange", label: "Orange", hex: "#f97316" },
];

export const instructionsHtml = `
  <strong>Color–Word Clash</strong> — A color word appears in <em>ink</em> of a different color.
  Tap the swatch that matches the <strong>ink</strong>, not what the word says.`;

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

  function beginRound() {
    alive = true;
    shell.hideResult();
    root.innerHTML = "";

    const difficulty = shell.getDifficulty();
    const word = pick(PALETTE);
    const ink = pick(PALETTE.filter((c) => c.key !== word.key));

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Which ink color do you see?";
    root.appendChild(phase);

    const wordEl = document.createElement("div");
    wordEl.className = "stroop-word";
    wordEl.textContent = word.label.toUpperCase();
    wordEl.style.color = ink.hex;
    root.appendChild(wordEl);

    const distractors = pickN(
      PALETTE.filter((c) => c.key !== ink.key),
      3,
    );
    const choices = shuffle([ink, ...distractors]);

    const row = document.createElement("div");
    row.className = "stroop-choices";
    root.appendChild(row);

    const finish = (correct) => {
      if (!alive) return;
      const pts = correct ? 85 + difficulty * 15 : 0;
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
        correct ? "Correct." : "That was the word, not the ink.",
        correct
          ? `+${pts} points. Ink was ${ink.label}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`
          : `Ink was ${ink.label}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      );
    };

    /** @type {Map<string, HTMLButtonElement>} */
    const swatchByKey = new Map();

    for (const c of choices) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "stroop-swatch";
      b.style.setProperty("--swatch", c.hex);
      b.setAttribute("aria-label", c.label);
      swatchByKey.set(c.key, b);
      b.addEventListener("click", async () => {
        disableControls(row.querySelectorAll("button"));
        const correct = c.key === ink.key;
        const correctBtn = swatchByKey.get(ink.key);
        if (correct) {
          b.classList.add("mark-correct");
        } else {
          b.classList.add("mark-wrong");
          correctBtn?.classList.add("mark-correct");
        }
        await delay(FEEDBACK_REVEAL_MS);
        if (!alive) return;
        finish(correct);
      });
      row.appendChild(b);
    }
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
