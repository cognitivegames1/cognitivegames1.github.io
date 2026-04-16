/**
 * @typedef {import('./games/shared/task.js').Domain} Domain
 */

/**
 * @typedef {object} TestStage
 * @property {string} game          game slug that exports runTask + taskMeta
 * @property {number} difficulty    fixed difficulty 1..5 for this stage
 * @property {number} [weight]      weight in aggregation (default 1)
 * @property {string} [note]        short label shown during the test
 */

/**
 * @typedef {object} TestMeta
 * @property {string} slug
 * @property {string} title
 * @property {string} description
 * @property {string} estimatedTime    human-readable "~8 min"
 * @property {string} accent           accent color (css hex)
 * @property {string} icon
 * @property {TestStage[]} stages
 */

/** @type {TestMeta[]} */
export const TESTS = [
  {
    slug: "cognitive-snapshot",
    title: "Cognitive Snapshot",
    description:
      "Four-domain benchmark: short-term memory, attention, inhibition, and spatial recall at fixed levels. Same protocol every run, so scores are comparable over time.",
    estimatedTime: "~10 min",
    accent: "#d97706",
    icon: "◈",
    stages: [
      { game: "sequence-echo",    difficulty: 2, note: "Sequence (easy)" },
      { game: "sequence-echo",    difficulty: 4, note: "Sequence (hard)" },
      { game: "pattern-grid",     difficulty: 2, note: "Pattern (easy)" },
      { game: "pattern-grid",     difficulty: 4, note: "Pattern (hard)" },
      { game: "path-memory",      difficulty: 3, note: "Path" },
      { game: "piece-recall",     difficulty: 3, note: "Piece recall" },
      { game: "chess-glance",     difficulty: 3, note: "Change detection" },
      { game: "number-sweep",     difficulty: 3, note: "Visual search" },
      { game: "color-word-clash", difficulty: 3, note: "Stroop" },
    ],
  },
];

/**
 * @param {string} slug
 */
export function findTest(slug) {
  return TESTS.find((t) => t.slug === slug);
}
