import { createChessBoard, pieceGlyph, pieceName } from "../lib/chess-board.js";
import { randomPlacements } from "../lib/chess-position.js";
import { randInt, shuffle } from "../lib/random.js";
import { POSITION_REVEAL_MS } from "../lib/feedback.js";
import { delay } from "../lib/async.js";
import { mountGame } from "./shared/game-session.js";

export const instructionsHtml = `
  <strong>Piece Recall</strong> — Memorize the full position. When it vanishes, we name a piece —
  tap the square where it stood. You answer multiple piece-location questions per board.`;

/** @type {import('./shared/task.js').TaskMeta} */
export const taskMeta = { domains: ["memory", "spatial"] };

/**
 * @param {HTMLElement} root
 * @param {import('./shared/task.js').TaskEnv} env
 * @returns {Promise<import('./shared/task.js').TaskResult | null>}
 */
export function runTask(root, env) {
  const { difficulty, isActive } = env;
  const memorizeMs = randInt(
    Math.max(2000, 5500 - difficulty * 600),
    Math.max(2800, 6700 - difficulty * 620),
  );
  const minPieces = 5 + difficulty;
  const maxPieces = Math.min(minPieces + 4, 16);

  const placements = randomPlacements(minPieces, maxPieces);
  const entries = /** @type {[string, string][]} */ (Object.entries(placements));
  const counts = new Map();
  for (const [, p] of entries) counts.set(p, (counts.get(p) ?? 0) + 1);
  const uniquePool = entries.filter(([, p]) => counts.get(p) === 1);
  const pool = uniquePool.length > 0 ? uniquePool : entries;
  const targetQuestions = difficulty >= 5 ? 4 : difficulty >= 3 ? 3 : 2;
  const questionCount = Math.min(pool.length, targetQuestions);
  const questions = shuffle(pool).slice(0, questionCount);

  const askLabel = (q) => {
    const [sq, piece] = q;
    if ((counts.get(piece) ?? 0) > 1) return `${pieceName(piece)} on ${sq.toUpperCase()}`;
    return pieceName(piece);
  };

  return new Promise(async (resolve) => {
    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize every piece…";
    root.appendChild(phase);

    const wrap1 = document.createElement("div");
    root.appendChild(wrap1);
    createChessBoard(wrap1, placements, { interactive: false });

    await delay(memorizeMs);
    if (!isActive()) return resolve(null);
    wrap1.remove();

    const wrap2 = document.createElement("div");
    root.appendChild(wrap2);

    let qIdx = 0;
    let correctCount = 0;
    let lock = false;

    const renderQuestion = () => {
      const [targetSquare, targetPiece] = questions[qIdx];
      phase.innerHTML = `Q${qIdx + 1}/${questionCount}: Where was <strong>${askLabel([targetSquare, targetPiece])}</strong> <span aria-hidden="true" style="font-size:1.35rem">${pieceGlyph(targetPiece)}</span>?`;
    };

    const board = createChessBoard(wrap2, {}, {
      interactive: true,
      onCellClick: async (sq) => {
        if (lock || !isActive()) return;
        lock = true;
        const [targetSquare] = questions[qIdx];
        const correct = sq === targetSquare;
        if (correct) correctCount += 1;

        board.setPosition(placements);
        board.clearMarks();
        board.setHighlight(targetSquare, "mark-correct");
        if (!correct) board.setHighlight(sq, "mark-wrong");

        await delay(POSITION_REVEAL_MS);
        if (!isActive()) return resolve(null);

        qIdx += 1;
        if (qIdx < questionCount) {
          board.clearMarks();
          board.setPosition({});
          renderQuestion();
          lock = false;
          return;
        }

        const qualityFraction = questionCount > 0 ? correctCount / questionCount : 0;
        const success = qualityFraction >= 0.67;
        const speedBonus = Math.max(0, 60 - Math.floor(memorizeMs / 220));
        const pts = success
          ? Math.round((120 + difficulty * 14 + speedBonus) * (0.55 + 0.45 * qualityFraction))
          : 0;
        resolve({
          success,
          quality: qualityFraction,
          points: pts,
          metrics: {
            pieceRecallQuestions: questionCount,
            pieceRecallCorrect: correctCount,
          },
          summary: `Correct ${correctCount}/${questionCount}.`,
        });
        lock = false;
      },
    });

    renderQuestion();
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
        title: result.success ? "Positions tracked." : "Some positions slipped.",
        detail: `${result.success ? `+${result.points} points. ` : ""}Correct ${m.pieceRecallCorrect}/${m.pieceRecallQuestions}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
