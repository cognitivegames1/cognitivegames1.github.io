import { createChessBoard } from "../lib/chess-board.js";
import { buildBoardChange } from "../lib/chess-change.js";
import { randomPlacements } from "../lib/chess-position.js";
import { randInt } from "../lib/random.js";
import { delay } from "../lib/async.js";
import { mountGame } from "./shared/game-session.js";

export const instructionsHtml = `
  <strong>Chess Glance</strong> — Study the board briefly. It disappears, then a new board appears with
  one additional piece. Tap the square where the new piece appeared.`;

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["memory", "attention"] };

function generateChange(minPieces, maxPieces) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const placements = randomPlacements(minPieces, maxPieces);
    const change = buildBoardChange(placements, { singleSquareOnly: true, addOnly: true });
    if (change) return { placements, change };
  }
  const fallback = randomPlacements(4, 5);
  const change = buildBoardChange(fallback, { singleSquareOnly: true, addOnly: true });
  return change ? { placements: fallback, change } : null;
}

/**
 * @param {HTMLElement} root
 * @param {import('./shared/task.js').TaskEnv} env
 * @returns {Promise<import('./shared/task.js').TaskResult | null>}
 */
export function runTask(root, env) {
  const { difficulty, isActive } = env;
  const memorizeMs = randInt(
    Math.max(1700, 4800 - difficulty * 480),
    Math.max(2300, 5800 - difficulty * 500),
  );
  const clearMs = Math.max(600, 1300 - difficulty * 120);
  const minPieces = 4 + difficulty;
  const maxPieces = Math.min(minPieces + 3, 16);

  const generated = generateChange(minPieces, maxPieces);
  if (!generated) return Promise.resolve(null);

  const { placements: placements1, change } = generated;
  const placements2 = change.nextPlacements;
  const changedSquares = change.changedSquares;
  const questionCount = changedSquares.length;

  return new Promise(async (resolve) => {
    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize the position…";
    root.appendChild(phase);

    const wrap1 = document.createElement("div");
    root.appendChild(wrap1);
    createChessBoard(wrap1, placements1, { interactive: false });

    await delay(memorizeMs);
    if (!isActive()) return resolve(null);
    wrap1.remove();

    phase.textContent = "Clearing board…";
    const clearWrap = document.createElement("div");
    root.appendChild(clearWrap);
    createChessBoard(clearWrap, {}, { interactive: false });
    await delay(clearMs);
    if (!isActive()) return resolve(null);
    clearWrap.remove();

    phase.innerHTML = `Find the changed square${questionCount === 1 ? "" : "s"}.`;

    const wrap2 = document.createElement("div");
    root.appendChild(wrap2);

    const found = new Set();
    let attempts = 0;
    const attemptLimit = questionCount + 1;

    const board = createChessBoard(wrap2, placements2, {
      interactive: true,
      onCellClick: (sq) => {
        if (!isActive()) return;
        if (attempts >= attemptLimit || found.size >= questionCount) return;
        attempts += 1;
        const correct = changedSquares.includes(sq) && !found.has(sq);
        if (correct) found.add(sq);

        const roundOver = found.size >= questionCount || attempts >= attemptLimit;
        board.clearMarks();
        const highlightSet = roundOver ? changedSquares : [...found];
        for (const s of highlightSet) board.setHighlight(s, "mark-correct");
        if (!correct) board.setHighlight(sq, "mark-wrong");

        phase.innerHTML = `Found ${found.size}/${questionCount} new square${questionCount === 1 ? "" : "s"}. Attempts ${attempts}/${attemptLimit}.`;
        if (!roundOver) return;

        const qualityFraction = questionCount > 0 ? found.size / questionCount : 0;
        const success = found.size === questionCount;
        const attemptFactor = (attemptLimit - attempts + 1) / attemptLimit;
        const pts = success
          ? Math.round((100 + difficulty * 14) * (0.58 + 0.42 * attemptFactor))
          : 0;
        resolve({
          success,
          quality: qualityFraction,
          points: pts,
          metrics: {
            chessGlanceTargets: questionCount,
            chessGlanceFound: found.size,
            chessGlanceAttempts: attempts,
            chessGlanceChange: change.summary,
          },
          summary: `Found ${found.size}/${questionCount}. Change: ${change.summary}.`,
        });
      },
    });
  });
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
        title: result.success ? "Board changes tracked." : "Some changes missed.",
        detail: `${result.success ? `+${result.points} points. ` : ""}Found ${m.chessGlanceFound}/${m.chessGlanceTargets}. Change: ${m.chessGlanceChange}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
