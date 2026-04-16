import { createRoundRuntime } from "./round-runtime.js";
import { showSessionComplete } from "./results.js";

/**
 * @typedef {import('./task.js').TaskResult} TaskResult
 * @typedef {import('./task.js').TaskEnv} TaskEnv
 */

/**
 * Wraps a pure runTask into a full game: handles session loop, scoring,
 * result panel, and teardown. Games only define the task mechanic + how
 * to phrase the between-round result.
 *
 * @param {HTMLElement} root
 * @param {import('../../play-shell.js').GameShell} shell
 * @param {{
 *   runTask: (root: HTMLElement, env: TaskEnv) => Promise<TaskResult | null>,
 *   buildResult: (args: { result: TaskResult, progress: { round: number, totalRounds: number, nextDifficulty: number } }) => { title: string, detail: string },
 *   onTeardown?: () => void,
 * }} opts
 */
export function mountGame(root, shell, opts) {
  const runtime = createRoundRuntime(root, shell, { onTeardown: opts.onTeardown });

  async function beginRound() {
    const token = runtime.beginRound();
    const difficulty = shell.getDifficulty();
    const isActive = () => runtime.isActive(token);

    const result = await opts.runTask(root, { difficulty, isActive });
    if (!result || !isActive()) return;

    const progress = shell.recordRound(result.success, result.points, {
      qualityFraction: result.quality,
      metrics: result.metrics,
    });

    if (progress.done) {
      showSessionComplete(shell, progress);
      return;
    }

    const { title, detail } = opts.buildResult({ result, progress });
    shell.showResult(title, detail);
  }

  return {
    restart: beginRound,
    reset: runtime.reset,
    destroy: runtime.teardown,
  };
}
