/** @type {readonly string[]} */
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PIECE_THEME = "css/{piece}.png";

const PIECE_CHARS = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

/**
 * @param {string} piece
 */
function toChessboardPiece(piece) {
  const upper = piece.toUpperCase();
  return piece === upper ? `w${upper}` : `b${upper}`;
}

/**
 * @param {Record<string, string>} placements square -> piece char
 */
function toChessboardPosition(placements) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [sq, piece] of Object.entries(placements)) {
    out[sq] = toChessboardPiece(piece);
  }
  return out;
}

function boardSquares() {
  const squares = [];
  for (let rank = 8; rank >= 1; rank--) {
    for (const file of FILES) squares.push(`${file}${rank}`);
  }
  return squares;
}

/**
 * @param {HTMLElement} container
 * @param {Record<string, string>} placements square -> piece char (K,k,Q, etc.)
 * @param {{ interactive?: boolean, onCellClick?: (square: string) => void }} options
 */
export function createChessBoard(container, placements, options = {}) {
  const { interactive = false, onCellClick } = options;
  container.innerHTML = "";
  container.classList.add("chess-wrap");

  const host = document.createElement("div");
  host.className = "chessboard-host";
  container.appendChild(host);

  const chessboardFactory = window.ChessBoard ?? window.Chessboard;
  if (typeof chessboardFactory !== "function") {
    host.textContent = "Failed to load chessboard.js";
    return {
      setHighlight() {},
      clearMarks() {},
    };
  }

  const boardId = `cg-board-${Math.random().toString(36).slice(2, 10)}`;
  host.id = boardId;

  chessboardFactory(boardId, {
    draggable: false,
    showNotation: false,
    position: toChessboardPosition(placements),
    pieceTheme: PIECE_THEME,
  });

  /** @type {Map<string, HTMLButtonElement>} */
  const markCells = new Map();
  if (interactive) {
    const hitGrid = document.createElement("div");
    hitGrid.className = "chess-hit-grid";

    for (const sq of boardSquares()) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chess-hit";
      btn.dataset.square = sq;
      btn.setAttribute("aria-label", `Select ${sq.toUpperCase()}`);
      btn.addEventListener("click", () => onCellClick?.(sq));
      hitGrid.appendChild(btn);
      markCells.set(sq, btn);
    }

    host.appendChild(hitGrid);
  }

  return {
    setHighlight(square, className) {
      const cell = markCells.get(square);
      if (cell) cell.classList.add(className);
    },
    clearMarks() {
      markCells.forEach((cell) => {
        cell.classList.remove("mark-correct", "mark-wrong");
      });
    },
  };
}

/**
 * @param {string} pieceChar
 */
export function pieceGlyph(pieceChar) {
  return PIECE_CHARS[/** @type {keyof typeof PIECE_CHARS} */ (pieceChar)] ?? "?";
}

export function pieceName(pieceChar) {
  const white = { K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight", P: "Pawn" };
  const black = { k: "King", q: "Queen", r: "Rook", b: "Bishop", n: "Knight", p: "Pawn" };
  const w = white[/** @type {keyof typeof white} */ (pieceChar)];
  if (w) return `White ${w}`;
  const b = black[/** @type {keyof typeof black} */ (pieceChar)];
  if (b) return `Black ${b}`;
  return pieceChar;
}
