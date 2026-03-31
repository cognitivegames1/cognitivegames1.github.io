import { createChessBoard, pieceGlyph, pieceName } from "../lib/chess-board.js";
import { randomPlacements } from "../lib/chess-position.js";
import { pick, randInt } from "../lib/random.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instructionsHtml = `
  <strong>Piece Recall</strong> — Memorize the full position. When it vanishes, tap the square where the
  highlighted piece <em>was</em>.`;

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
    const [targetSquare, targetPiece] = pick(pool);
    const ask = pieceName(targetPiece);

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize every piece…";
    root.appendChild(phase);

    const wrap1 = document.createElement("div");
    root.appendChild(wrap1);
    createChessBoard(wrap1, placements, { interactive: false });

    await sleep(memorizeMs);
    if (!alive) return;

    wrap1.remove();
    phase.innerHTML = `Where was <strong>${ask}</strong> <span aria-hidden="true" style="font-size:1.35rem">${pieceGlyph(targetPiece)}</span>?`;

    const wrap2 = document.createElement("div");
    root.appendChild(wrap2);

    let answered = false;

    const board = createChessBoard(wrap2, {}, {
      interactive: true,
      onCellClick: (sq) => {
        if (answered) return;
        answered = true;
        const correct = sq === targetSquare;
        board.clearMarks();
        board.setHighlight(targetSquare, "mark-correct");
        if (!correct) board.setHighlight(sq, "mark-wrong");

        const base = 120;
        const bonus = correct ? Math.max(0, 50 - Math.floor(memorizeMs / 250)) : 0;
        const pts = correct ? base + bonus : 0;
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
          correct ? "Locked in." : "Miss.",
          `${correct
            ? `+${pts} points. Correct square: ${targetSquare.toUpperCase()}.`
            : `It was on ${targetSquare.toUpperCase()}.`} Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
        );
      },
    });
  }

  return {
    restart: beginRound,
    reset,
    destroy: teardown,
  };
}
