/**
 * @param {import('../../play-shell.js').GameShell} shell
 * @param {{ rating: number, wins: number, totalRounds: number }} progress
 */
export function showSessionComplete(shell, progress) {
  shell.showResult(
    "Session complete.",
    `Performance: ${progress.rating}/100. Wins: ${progress.wins}/${progress.totalRounds}. Total points: ${shell.getScore()}.`,
  );
}
