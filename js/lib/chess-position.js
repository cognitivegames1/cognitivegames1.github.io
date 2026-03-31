import { pickN, randInt } from "./random.js";

const FILES = "abcdefgh";
const STARTING_PIECES = [
  "K", "Q", "R", "R", "B", "B", "N", "N", "P", "P", "P", "P", "P", "P", "P", "P",
  "k", "q", "r", "r", "b", "b", "n", "n", "p", "p", "p", "p", "p", "p", "p", "p",
];
const STARTING_PIECES_NO_KINGS = STARTING_PIECES.filter((p) => p !== "K" && p !== "k");

function allSquares() {
  return [...Array(64)].map((_, i) => {
    const file = i % 8;
    const rank = Math.floor(i / 8);
    return `${FILES[file]}${rank + 1}`;
  });
}

/**
 * Random board-style placements with realistic piece limits and both kings present.
 * @param {number} minPieces
 * @param {number} maxPieces
 * @returns {Record<string, string>}
 */
export function randomPlacements(minPieces, maxPieces) {
  const cap = STARTING_PIECES.length;
  const low = Math.max(2, Math.min(minPieces, maxPieces));
  const high = Math.max(2, Math.max(minPieces, maxPieces));
  const maxAllowed = Math.min(high, cap);
  const minAllowed = Math.min(low, maxAllowed);
  const nPieces = randInt(minAllowed, maxAllowed);

  const pieces = ["K", "k", ...pickN(STARTING_PIECES_NO_KINGS, nPieces - 2)];
  const squares = pickN(allSquares(), nPieces);

  /** @type {Record<string, string>} */
  const placements = {};
  for (let i = 0; i < nPieces; i++) placements[squares[i]] = pieces[i];
  return placements;
}
