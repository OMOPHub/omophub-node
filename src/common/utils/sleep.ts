/**
 * Promise-based sleep. Resolves after `ms` milliseconds. If a signal is
 * provided and aborted, rejects with the signal's reason and clears the timer.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}
