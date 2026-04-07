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

export const instructionsHtml = `
  <strong>Color–Word Clash</strong> — Stroop trials: each time, a color word appears in <em>ink</em> of a different color.
  Tap the swatch that matches the <strong>ink</strong>, not what the word says. Higher levels add more trials,
  more competing colors, and less time to answer.`;

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
    const trialCount = 5 + (difficulty >= 3 ? 1 : 0) + (difficulty >= 5 ? 1 : 0);
    const choiceCount = Math.min(PALETTE.length, difficulty <= 2 ? 4 : difficulty === 3 ? 5 : 6);
    const responseMs = Math.max(1800, 4600 - difficulty * 420);
    const passThreshold = Math.ceil(trialCount * (difficulty >= 4 ? 0.8 : 0.75));
    let correct = 0;
    let misses = 0;
    let totalResponseMs = 0;

    const phase = document.createElement("p");
    phase.className = "phase-label";
    root.appendChild(phase);

    const wordEl = document.createElement("div");
    wordEl.className = "stroop-word";
    root.appendChild(wordEl);

    const row = document.createElement("div");
    row.className = "stroop-choices";
    root.appendChild(row);

    for (let t = 0; t < trialCount; t++) {
      if (!isActive()) return;
      phase.textContent = `Trial ${t + 1}/${trialCount} — match the ink color in ${Number((responseMs / 1000).toFixed(1))}s.`;
      row.innerHTML = "";

      const word = pick(PALETTE);
      const ink = pick(PALETTE.filter((c) => c.key !== word.key));
      wordEl.textContent = word.label.toUpperCase();
      wordEl.style.color = ink.hex;

      const distractors = pickN(
        PALETTE.filter((c) => c.key !== ink.key),
        Math.max(0, choiceCount - 1),
      );
      const choices = shuffle([ink, ...distractors]);
      const trialStart = performance.now();

      /** @type {Map<string, HTMLButtonElement>} */
      const swatchByKey = new Map();

      await new Promise((resolve) => {
        const finishTrial = () => {
          if (!pendingTrialResolve) return;
          const done = pendingTrialResolve;
          pendingTrialResolve = null;
          done();
        };
        pendingTrialResolve = () => {
          pendingTrialResolve = null;
          resolve();
        };
        let settled = false;
        const timeoutId = window.setTimeout(async () => {
          if (!isActive() || settled) return;
          settled = true;
          misses += 1;
          totalResponseMs += responseMs;
          disableControls(row.querySelectorAll("button"));
          swatchByKey.get(ink.key)?.classList.add("mark-correct");
          phase.textContent = `Too slow. Trial ${t + 1}/${trialCount}.`;
          await delay(FEEDBACK_REVEAL_MS);
          finishTrial();
        }, responseMs);
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
            window.clearTimeout(timeoutId);
            disableControls(row.querySelectorAll("button"));
            const ok = c.key === ink.key;
            totalResponseMs += performance.now() - trialStart;
            if (ok) correct += 1;
            else misses += 1;
            const correctBtn = swatchByKey.get(ink.key);
            if (ok) {
              b.classList.add("mark-correct");
            } else {
              b.classList.add("mark-wrong");
              correctBtn?.classList.add("mark-correct");
            }
            await delay(FEEDBACK_REVEAL_MS);
            finishTrial();
          });
          row.appendChild(b);
        }
      });
      if (!isActive()) return;
    }

    if (!isActive()) return;

    const success = correct >= passThreshold;
    const acc = correct / trialCount;
    const avgResponseMs = trialCount > 0 ? totalResponseMs / trialCount : responseMs;
    const speedQuality = Math.max(0, Math.min(1, (responseMs - avgResponseMs) / Math.max(1, responseMs - 900)));
    const base = 85 + difficulty * 15;
    const pts = success ? Math.round(base * (0.62 + 0.23 * acc + 0.15 * speedQuality)) : 0;
    const progress = shell.recordRound(success, pts, {
      qualityFraction: Math.max(0, Math.min(1, 0.8 * acc + 0.2 * speedQuality)),
      metrics: { trialsCorrect: correct, trialsTotal: trialCount, trialsMisses: misses, stroopChoiceCount: choiceCount, stroopResponseMs: responseMs, stroopAvgResponseMs: Math.round(avgResponseMs) },
    });

    shell.stopTimer();
    if (progress.done) {
      showSessionComplete(shell, progress);
      return;
    }

    shell.showResult(
      success ? "Round clear." : "Too many slips.",
      `${success ? `+${pts} points. ` : ""}Correct: ${correct}/${trialCount}. Misses: ${misses}. Avg response: ${Math.round(avgResponseMs)} ms. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
    );
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
