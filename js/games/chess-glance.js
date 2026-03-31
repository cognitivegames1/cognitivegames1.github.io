import { createChessBoard } from "../lib/chess-board.js";
import { randomPlacements } from "../lib/chess-position.js";
import { pick, randInt } from "../lib/random.js";

const WHITE = ["K", "Q", "R", "B", "N", "P"];
const BLACK = ["k", "q", "r", "b", "n", "p"];

function randomPiece() {
  return Math.random() < 0.5 ? pick(WHITE) : pick(BLACK);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const instructionsHtml = `
  <strong>Chess Glance</strong> — Study the board briefly. It disappears, then a new board appears with
  <em>one extra piece</em>. Tap the square where that new piece sits.`;

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
      Math.max(1800, 5200 - difficulty * 500),
      Math.max(2200, 6200 - difficulty * 520),
    );
    const minPieces = 4 + difficulty;
    const maxPieces = Math.min(minPieces + 3, 16);

    const placements1 = randomPlacements(minPieces, maxPieces);
    const occupied = new Set(Object.keys(placements1));
    const allSq = [...Array(64)].map((_, i) => {
      const files = "abcdefgh";
      const file = i % 8;
      const rank = Math.floor(i / 8);
      return `${files[file]}${rank + 1}`;
    });
    const empty = allSq.filter((s) => !occupied.has(s));
    const newSquare = pick(empty);
    const placements2 = { ...placements1, [newSquare]: randomPiece() };

    const phase = document.createElement("p");
    phase.className = "phase-label";
    phase.textContent = "Memorize the position…";
    root.appendChild(phase);

    const wrap1 = document.createElement("div");
    root.appendChild(wrap1);
    createChessBoard(wrap1, placements1, { interactive: false });

    await sleep(memorizeMs);
    if (!alive) return;

    wrap1.remove();

    // Briefly show an empty board between phases to avoid transition cues.
    phase.textContent = "Clearing board…";
    const clearWrap = document.createElement("div");
    root.appendChild(clearWrap);
    createChessBoard(clearWrap, {}, { interactive: false });
    await sleep(1000);
    if (!alive) return;
    clearWrap.remove();

    phase.innerHTML = "Which square has the <strong>new</strong> piece?";

    const wrap2 = document.createElement("div");
    root.appendChild(wrap2);

    let answered = false;

    const board = createChessBoard(wrap2, placements2, {
      interactive: true,
      onCellClick: (sq) => {
        if (answered) return;
        answered = true;
        const correct = sq === newSquare;
        board.clearMarks();
        board.setHighlight(newSquare, "mark-correct");
        if (!correct) board.setHighlight(sq, "mark-wrong");

        const base = 100;
        const bonus = correct ? Math.max(0, 40 - Math.floor(memorizeMs / 200)) : 0;
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
          correct ? "Nice eye." : "Not quite.",
          `${correct
            ? `+${pts} points. The new piece was on ${newSquare.toUpperCase()}.`
            : `The new piece was on ${newSquare.toUpperCase()}.`} Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
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
