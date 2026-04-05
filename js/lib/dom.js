/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
export function requireEl(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element: #${id}`);
  }
  return /** @type {T} */ (el);
}
