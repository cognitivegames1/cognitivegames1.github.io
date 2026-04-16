/**
 * @typedef {"memory" | "attention" | "inhibition" | "spatial" | "speed"} Domain
 */

/**
 * @typedef {object} TaskEnv
 * @property {number} difficulty
 * @property {() => boolean} isActive
 */

/**
 * @typedef {object} TaskResult
 * @property {boolean} success
 * @property {number} quality         [0,1]
 * @property {number} points
 * @property {Record<string, number|string|boolean|null>} metrics
 * @property {string} [summary]       short one-line description of the task outcome
 */

/**
 * @typedef {object} TaskMeta
 * @property {Domain[]} domains
 */

export {};
