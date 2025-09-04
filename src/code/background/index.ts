import { update } from "../browser-api";
import { debounceUpdate } from "./utils";
import { BrowserEvents } from "../content/events";

console.info("background script running");

// Update when the active tab changes
browser.tabs.onActivated.addListener(async (info) => {
  console.info("browser.tabs.onActivated, info:", info);
  void update({
    browserEvent: BrowserEvents.TabsOnActivated,
  });
});

/* Update when url changes within the same tab, debouncing repeated events emitted */
const getDebouncedTab = debounceUpdate(100);
browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    const lastTab = await getDebouncedTab(tab);
    console.info("browser.tabs.onUpdated, tab:", lastTab);
    void update({
      browserEvent: BrowserEvents.TabsOnUpdated,
      activeTab: lastTab,
    });
  }
});

// Update when the storage state changes
browser.storage.onChanged.addListener(async (changes, area) => {
  console.info("storage.onChanged, changes:", changes);
  if (area === "local" && changes.extensionIsEnabled) {
    void update({
      browserEvent: BrowserEvents.StorageOnChanged,
      extensionIsEnabled: changes.extensionIsEnabled.newValue,
    });
  }
});
