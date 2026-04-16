import { pick, pickN, shuffle } from "../lib/random.js";
import { FEEDBACK_REVEAL_MS, disableControls } from "../lib/feedback.js";
import { delay } from "../lib/async.js";
import { mountGame } from "./shared/game-session.js";

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

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["inhibition", "attention"] };

/**
 * @param {HTMLElement} root
 * @param {import('./shared/task.js').TaskEnv} env
 * @returns {Promise<import('./shared/task.js').TaskResult | null>}
 */
export function runTask(root, env) {
  const { difficulty, isActive } = env;
  const trialCount = 4 + difficulty;
  const choiceCount = Math.min(PALETTE.length, difficulty <= 2 ? 4 : difficulty === 3 ? 5 : 6);
  const responseMs = Math.max(1600, 4200 - difficulty * 400);
  const passThreshold = Math.ceil(trialCount * (difficulty >= 4 ? 0.75 : 0.7));

  let correct = 0;
  let misses = 0;
  let totalResponseMs = 0;
  /** @type {null | (() => void)} */
  let pendingResolve = null;

  const phase = document.createElement("p");
  phase.className = "phase-label";
  root.appendChild(phase);

  const wordEl = document.createElement("div");
  wordEl.className = "stroop-word";
  root.appendChild(wordEl);

  const row = document.createElement("div");
  row.className = "stroop-choices";
  root.appendChild(row);

  return (async () => {
    for (let t = 0; t < trialCount; t++) {
      if (!isActive()) return null;
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
        pendingResolve = resolve;
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
          pendingResolve = null;
          resolve();
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
            if (ok) b.classList.add("mark-correct");
            else {
              b.classList.add("mark-wrong");
              correctBtn?.classList.add("mark-correct");
            }
            await delay(FEEDBACK_REVEAL_MS);
            pendingResolve = null;
            resolve();
          });
          row.appendChild(b);
        }
      });
      if (!isActive()) return null;
    }

    const success = correct >= passThreshold;
    const acc = trialCount > 0 ? correct / trialCount : 0;
    const avgResponseMs = trialCount > 0 ? totalResponseMs / trialCount : responseMs;
    const speedQuality = Math.max(0, Math.min(1, (responseMs - avgResponseMs) / Math.max(1, responseMs - 900)));
    const base = 85 + difficulty * 15;
    const pts = success ? Math.round(base * (0.62 + 0.23 * acc + 0.15 * speedQuality)) : 0;

    return {
      success,
      quality: Math.max(0, Math.min(1, 0.8 * acc + 0.2 * speedQuality)),
      points: pts,
      metrics: {
        trialsCorrect: correct,
        trialsTotal: trialCount,
        trialsMisses: misses,
        stroopChoiceCount: choiceCount,
        stroopResponseMs: responseMs,
        stroopAvgResponseMs: Math.round(avgResponseMs),
      },
      summary: `Correct ${correct}/${trialCount}, avg ${Math.round(avgResponseMs)} ms.`,
    };
  })();
}

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  return mountGame(root, shell, {
    runTask,
    buildResult({ result, progress }) {
      const m = /** @type {any} */ (result.metrics);
      return {
        title: result.success ? "Round clear." : "Too many slips.",
        detail: `${result.success ? `+${result.points} points. ` : ""}Correct: ${m.trialsCorrect}/${m.trialsTotal}. Misses: ${m.trialsMisses}. Avg response: ${m.stroopAvgResponseMs} ms. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
