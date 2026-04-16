export const FEEDBACK_REVEAL_MS = 320;
export const MISTAKE_FLASH_MS = 280;
export const POSITION_REVEAL_MS = 1100;
export const PAIR_MISMATCH_MS = 520;

/**
 * @param {Iterable<HTMLButtonElement>} controls
 */
export function disableControls(controls) {
  for (const control of controls) control.disabled = true;
}
