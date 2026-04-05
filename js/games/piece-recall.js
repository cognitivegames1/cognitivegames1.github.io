import { createChessBoard, pieceGlyph, pieceName } from "../lib/chess-board.js";
import { randomPlacements } from "../lib/chess-position.js";
import { randInt, shuffle } from "../lib/random.js";
import { delay } from "../lib/async.js";
import { createRoundRuntime } from "./shared/round-runtime.js";
import { showSessionComplete } from "./shared/results.js";

export const instructionsHtml = `
  <strong>Piece Recall</strong> — Memorize the full position. When it vanishes, tap the square where the
  highlighted piece <em>was</em>. You answer multiple piece-location questions per board.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  const runtime = createRoundRuntime(root, shell);
  const teardown = runtime.teardown;
  const reset = runtime.reset;

  async function beginRound() {
    const myRound = runtime.beginRound();

    const difficulty = shell.getDifficulty();
    const memorizeMs = randInt(
      Math.max(2200, 7000 - difficulty * 650),
      Math.max(3000, 8200 - difficulty * 680),
    );
    const minPieces = 5 + difficulty;
    const maxPieces = Math.min(minPieces + 4, 16);

    const placements = randomPlacements(minPieces, maxPieces);
    const entries = /** @type {[string, string][]} */ (Object.entries(placements));
    const counts = new Map();
    for (const [, p] of entries) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    const uniquePool = entries.filter(([, p]) => counts.get(p) === 1);
    const pool = uniquePool.length > 0 ? uniquePool : entries;
    const questionCount = Math.min(pool.length, difficulty >= 4 ? 3 : 2);
    const questions = shuffle(pool).slice(0, questionCount);

    /**
     * @param {[string, string]} q
     */
    function askLabel(q) {
      const [sq, piece] = q;
      if ((counts.get(piece) ?? 0) > 1) {
        return `${pieceName(piece)} on ${sq.toUpperCase()}`;
      }
      return pieceName(piece);
    }

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize every piece…";
    root.appendChild(phase);

    const wrap1 = document.createElement("div");
    root.appendChild(wrap1);
    createChessBoard(wrap1, placements, { interactive: false });

    await delay(memorizeMs);
    if (!runtime.isActive(myRound)) return;

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
        if (lock || !runtime.isActive(myRound)) return;
        lock = true;
        const [targetSquare] = questions[qIdx];
        const correct = sq === targetSquare;
        if (correct) correctCount += 1;
        board.clearMarks();
        board.setHighlight(targetSquare, "mark-correct");
        if (!correct) board.setHighlight(sq, "mark-wrong");

        await delay(280);
        if (!runtime.isActive(myRound)) return;
        board.clearMarks();

        qIdx += 1;
        if (qIdx < questionCount) {
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
        const progress = shell.recordRound(success, pts, {
          qualityFraction,
          metrics: {
            pieceRecallQuestions: questionCount,
            pieceRecallCorrect: correctCount,
          },
        });

        shell.stopTimer();
        if (progress.done) {
          showSessionComplete(shell, progress);
          return;
        }

        shell.showResult(
          success ? "Positions tracked." : "Some positions slipped.",
          `${success ? `+${pts} points. ` : ""}Correct ${correctCount}/${questionCount}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
      },
    });

    renderQuestion();
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
