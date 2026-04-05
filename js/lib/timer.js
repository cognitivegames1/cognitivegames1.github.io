/**
 * @param {(seconds: number) => void} onTick
 */
export function createElapsedTimer(onTick) {
  let id = null;
  let start = 0;

  function tick() {
    onTick((performance.now() - start) / 1000);
  }

  return {
    start() {
      if (id != null) window.clearInterval(id);
      start = performance.now();
      tick();
      id = window.setInterval(tick, 100);
    },
    stop() {
      if (id != null) window.clearInterval(id);
      id = null;
    },
  };
}

/**
 * @param {number} seconds
 */
export function formatTime(seconds) {
  const s = Math.floor(seconds);
  const ms = Math.floor((seconds - s) * 100);
  return `${s}.${ms.toString().padStart(2, "0")}s`;
}
