import { mountGridSequenceGame } from "./shared/sequence-grid-core.js";

export const instructionsHtml = `
  <strong>Sequence Echo</strong> — Tiles flash in order. Repeat the same order by tapping the grid.
  First wrong tap ends the round immediately.`;

/**
 * @param {HTMLElement} root
 * @param {import('../play-shell.js').GameShell} shell
 */
export function mount(root, shell) {
  return mountGridSequenceGame(root, shell, {
    timings(difficulty) {
      return {
        onMs: Math.max(130, 580 - difficulty * 85),
        offMs: Math.max(55, 240 - difficulty * 34),
      };
    },
    expectedOrder(sequence) {
      return sequence;
    },
    userPhaseText: "Your turn — repeat the sequence.",
    failOnFirstMistake: true,
    successThreshold: 0.7,
    pointsForSuccess({ difficulty, length, accuracy }) {
      return Math.round((70 + length * 12 + difficulty * 10) * (0.65 + 0.35 * accuracy));
    },
    metrics({ length, correctSteps, mistakes }) {
      return {
        sequenceLength: length,
        sequenceCorrect: correctSteps,
        sequenceMistakes: mistakes,
      };
    },
    roundResult({ success, points, correctSteps, mistakes, length, progress }) {
      return {
        title: success ? "Sequence held." : "Sequence slipped.",
        detail: `${success ? `+${points} points. ` : ""}Correct ${correctSteps}/${length}. Mistakes: ${mistakes}. Round ${progress.round}/${progress.totalRounds}. Next level: ${progress.nextDifficulty}.`,
      };
    },
  });
}
