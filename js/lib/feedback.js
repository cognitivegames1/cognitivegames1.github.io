import { delay } from "./async.js";

export const FEEDBACK_REVEAL_MS = 320;
export { delay };

/**
 * @param {Iterable<HTMLButtonElement>} controls
 */
export function disableControls(controls) {
  for (const control of controls) control.disabled = true;
}

/**
 * @param {Iterable<HTMLButtonElement>} controls
 * @param {number} [ms]
 */
export async function revealPause(controls, ms = FEEDBACK_REVEAL_MS) {
  disableControls(controls);
  await delay(ms);
}
