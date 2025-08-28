import Tab = browser.tabs.Tab;

export function debounceUpdate(durationMs: number): (tab: Tab) => Promise<Tab> {
  let lastTab: Tab | null = null;
  let debounceTimeout: NodeJS.Timeout | null = null;

  return (tab: Tab) =>
    new Promise((resolve) => {
      lastTab = tab;

      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = setTimeout(() => {
        if (lastTab) {
          resolve(lastTab);
          lastTab = null;
        }
      }, durationMs);
    });
}
