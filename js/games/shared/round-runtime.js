/**
 * @param {HTMLElement} root
 * @param {import('../../play-shell.js').GameShell} shell
 * @param {{ onTeardown?: () => void }} [opts]
 */
export function createRoundRuntime(root, shell, opts = {}) {
  let alive = true;
  let roundId = 0;
  const onTeardown = opts.onTeardown;

  function teardown() {
    alive = false;
    roundId += 1;
    onTeardown?.();
    root.innerHTML = "";
  }

  function reset() {
    teardown();
    shell.stopTimer();
    shell.resetTimerDisplay();
  }

  function beginRound() {
    roundId += 1;
    alive = true;
    shell.hideResult();
    root.innerHTML = "";
    return roundId;
  }

  /**
   * @param {number} token
   */
  function isActive(token) {
    return alive && token === roundId;
  }

  return {
    teardown,
    reset,
    beginRound,
    isActive,
  };
}
