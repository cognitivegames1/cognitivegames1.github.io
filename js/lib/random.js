export function randInt(min, max) {
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @template T
 * @param {T[]} arr
 * @returns {T | undefined}
 */
export function pick(arr) {
  if (arr.length === 0) return undefined;
  return arr[randInt(0, arr.length - 1)];
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} n
 * @returns {T[]}
 */
export function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const j = randInt(0, copy.length - 1);
    out.push(copy[j]);
    copy.splice(j, 1);
  }
  return out;
}

/**
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
