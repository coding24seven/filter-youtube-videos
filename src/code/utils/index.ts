export function debounce(callback: () => void, waitMs: number) {
  let timeout: NodeJS.Timeout;

  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      callback();
    }, waitMs);
  };
}

export function runAtIntervalFor(
  callback: () => void,
  intervalMs: number,
  durationMs: number,
) {
  const start = Date.now();

  const interval = setInterval(() => {
    if (Date.now() > start + durationMs) {
      clearInterval(interval);
    }

    callback();
  }, intervalMs);
}
