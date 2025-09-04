export function debounce(callback: () => void, waitMs: number) {
  let timeout: NodeJS.Timeout;

  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      callback();
    }, waitMs);
  };
}
