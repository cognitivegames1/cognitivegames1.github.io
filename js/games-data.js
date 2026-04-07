/** @typedef {'visual-memory' | 'working-memory' | 'spatial' | 'attention'} CategoryId */

/**
 * @typedef {{
 *   slug: string,
 *   title: string,
 *   category: CategoryId,
 *   description: string,
 *   difficulty: string,
 *   roundLength: string,
 *   accent: string,
 *   icon: string,
 *   sessionRounds?: number
 * }} GameMeta
 */

/** @type {{ id: CategoryId, label: string }[]} */
export const CATEGORIES = [
  { id: "visual-memory", label: "Visual Memory" },
  { id: "working-memory", label: "Working Memory" },
  { id: "spatial", label: "Spatial Reasoning" },
  { id: "attention", label: "Attention and Speed" },
];

/** @type {GameMeta[]} */
export const GAMES = [
  {
    slug: "cognitive-snapshot",
    title: "Cognitive Snapshot",
    category: "attention",
    description:
      "A 4-part combined check using memory, change detection, pair recall, and visual search.",
    difficulty: "Guided",
    roundLength: "~4–6 min",
    accent: "#d97706",
    icon: "◈",
    sessionRounds: 1,
  },
  {
    slug: "chess-glance",
    title: "Chess Glance",
    category: "visual-memory",
    description:
      "Memorize the board, then spot the one newly added piece.",
    difficulty: "Medium",
    roundLength: "~45s",
    accent: "#f472b6",
    icon: "♟",
  },
  {
    slug: "piece-recall",
    title: "Piece Recall",
    category: "visual-memory",
    description:
      "Study the position, then place the piece you were asked about. Same board engine as Chess Glance.",
    difficulty: "Medium",
    roundLength: "~1 min",
    accent: "#a78bfa",
    icon: "♜",
  },
  {
    slug: "pattern-grid",
    title: "Pattern Grid",
    category: "visual-memory",
    description:
      "Cells flash briefly, then disappear. Tap only remembered cells; first mistake ends the round.",
    difficulty: "Easy–Hard",
    roundLength: "~30–60s",
    accent: "#38bdf8",
    icon: "▦",
  },
  {
    slug: "sequence-echo",
    title: "Sequence Echo",
    category: "working-memory",
    description:
      "Watch the sequence, then tap tiles in the same order. Length and pace scale with difficulty.",
    difficulty: "Easy–Hard",
    roundLength: "~30–90s",
    accent: "#4ade80",
    icon: "◇",
  },
  {
    slug: "pair-recall",
    title: "Pair Recall",
    category: "visual-memory",
    description:
      "Flip two cards, remember positions, and clear the board in as few tries as possible.",
    difficulty: "Easy–Hard",
    roundLength: "~1–3 min",
    accent: "#c084fc",
    icon: "🎴",
  },
  {
    slug: "path-memory",
    title: "Path Memory",
    category: "spatial",
    description:
      "A path lights through adjacent cells. Watch, then retrace the same route in order.",
    difficulty: "Easy–Hard",
    roundLength: "~30–90s",
    accent: "#2dd4bf",
    icon: "⌗",
  },
  {
    slug: "number-sweep",
    title: "Number Sweep",
    category: "attention",
    description:
      "Tap scattered numbers in ascending order as fast as you can. Faster clears earn bonus points; one wrong tap ends the round.",
    difficulty: "Easy–Hard",
    roundLength: "~20–60s",
    accent: "#f472b6",
    icon: "🔢",
  },
  {
    slug: "color-word-clash",
    title: "Color–Word Clash",
    category: "attention",
    description:
      "Stroop-style: pick the ink color, not the word — five quick trials per round.",
    difficulty: "Easy–Hard",
    roundLength: "~45–90s",
    accent: "#38bdf8",
    icon: "◐",
  },
];

/**
 * @param {CategoryId | 'all'} filter
 * @returns {GameMeta[]}
 */
export function gamesForFilter(filter) {
  if (filter === "all") return GAMES;
  return GAMES.filter((g) => g.category === filter);
}

/**
 * @param {CategoryId} category
 * @returns {GameMeta[]}
 */
export function gamesInCategory(category) {
  return GAMES.filter((g) => g.category === category);
}
