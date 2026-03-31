/**
 * @typedef {import('./games-data.js').GameMeta} GameMeta
 */

/**
 * @typedef {object} GameShell
 * @property {GameMeta} meta
 * @property {(n: number) => void} setScore
 * @property {(delta: number) => void} addScore
 * @property {() => number} getScore
 * @property {() => number} getDifficulty
 * @property {(success: boolean, points?: number) => {
 *   round: number,
 *   totalRounds: number,
 *   nextDifficulty: number,
 *   wins: number,
 *   rating: number,
 *   done: boolean,
 * }} recordRound
 * @property {() => void} startTimer
 * @property {() => void} stopTimer
 * @property {() => void} resetTimerDisplay
 * @property {(title: string, detail: string) => void} showResult
 * @property {() => void} hideResult
 * @property {() => void} hideInstructions
 * @property {() => void} showInstructions
 */

export {};
