import { pick, pickN, shuffle } from "../lib/random.js";
import { FEEDBACK_REVEAL_MS, disableControls } from "../lib/feedback.js";
import { delay } from "../lib/async.js";
import { createRoundRuntime } from "./shared/round-runtime.js";
import { showSessionComplete } from "./shared/results.js";

const PALETTE = [
  { key: "red", label: "Red", hex: "#ef4444" },
  { key: "blue", label: "Blue", hex: "#3b82f6" },
  { key: "green", label: "Green", hex: "#22c55e" },
  { key: "yellow", label: "Yellow", hex: "#eab308" },
  { key: "purple", label: "Purple", hex: "#a855f7" },
  { key: "orange", label: "Orange", hex: "#f97316" },
];

const TRIALS_PER_ROUND = 5;
const PASS_THRESHOLD = 4;

export const instructionsHtml = `
  <strong>Color–Word Clash</strong> — Stroop trials: each time, a color word appears in <em>ink</em> of a different color.
  Tap the swatch that matches the <strong>ink</strong>, not what the word says. ${TRIALS_PER_ROUND} trials per round.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  /** @type {null | (() => void)} */
  let pendingTrialResolve = null;
  const runtime = createRoundRuntime(root, shell, {
    onTeardown() {
      pendingTrialResolve?.();
      pendingTrialResolve = null;
    },
  });
  const teardown = runtime.teardown;
  const reset = runtime.reset;

  async function beginRound() {
    const myRound = runtime.beginRound();
    const isActive = () => runtime.isActive(myRound);
    pendingTrialResolve = null;

    const difficulty = shell.getDifficulty();
    let correct = 0;

    const phase = document.createElement("p");
    phase.className = "phase-label";
    root.appendChild(phase);

    const wordEl = document.createElement("div");
    wordEl.className = "stroop-word";
    root.appendChild(wordEl);

    const row = document.createElement("div");
    row.className = "stroop-choices";
    root.appendChild(row);

    for (let t = 0; t < TRIALS_PER_ROUND; t++) {
      if (!isActive()) return;
      phase.textContent = `Trial ${t + 1}/${TRIALS_PER_ROUND} — which ink color do you see?`;
      row.innerHTML = "";

      const word = pick(PALETTE);
      const ink = pick(PALETTE.filter((c) => c.key !== word.key));
      wordEl.textContent = word.label.toUpperCase();
      wordEl.style.color = ink.hex;

      const distractors = pickN(
        PALETTE.filter((c) => c.key !== ink.key),
        3,
      );
      const choices = shuffle([ink, ...distractors]);

      /** @type {Map<string, HTMLButtonElement>} */
      const swatchByKey = new Map();

      await new Promise((resolve) => {
        pendingTrialResolve = () => {
          pendingTrialResolve = null;
          resolve();
        };
        let settled = false;
        for (const c of choices) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "stroop-swatch";
          b.style.setProperty("--swatch", c.hex);
          b.setAttribute("aria-label", c.label);
          swatchByKey.set(c.key, b);
          b.addEventListener("click", async () => {
            if (!isActive() || settled) return;
            settled = true;
            disableControls(row.querySelectorAll("button"));
            const ok = c.key === ink.key;
            if (ok) correct += 1;
            const correctBtn = swatchByKey.get(ink.key);
            if (ok) {
              b.classList.add("mark-correct");
            } else {
              b.classList.add("mark-wrong");
              correctBtn?.classList.add("mark-correct");
            }
            await delay(FEEDBACK_REVEAL_MS);
            if (pendingTrialResolve) {
              const done = pendingTrialResolve;
              pendingTrialResolve = null;
              done();
            }
          });
          row.appendChild(b);
        }
      });
      if (!isActive()) return;
    }

    if (!isActive()) return;

    const success = correct >= PASS_THRESHOLD;
    const acc = correct / TRIALS_PER_ROUND;
    const base = 85 + difficulty * 15;
    const pts = success ? Math.round(base * (0.72 + 0.28 * acc)) : 0;
    const progress = shell.recordRound(success, pts, {
      qualityFraction: acc,
      metrics: { trialsCorrect: correct, trialsTotal: TRIALS_PER_ROUND },
    });

    shell.stopTimer();
    if (progress.done) {
      showSessionComplete(shell, progress);
      return;
    }

    shell.showResult(
      success ? "Round clear." : "Too many slips.",
      `${success ? `+${pts} points. ` : ""}Correct: ${correct}/${TRIALS_PER_ROUND}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
    );
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
