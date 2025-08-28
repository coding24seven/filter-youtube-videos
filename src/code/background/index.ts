import { update } from "../browser-api";
import { debounceUpdate } from "./utils";

console.log("background script running");

// Update when the active tab changes
browser.tabs.onActivated.addListener(async (info) => {
  console.log("browser.tabs.onActivated, info:", info);
  void update();
});

const getDebouncedTab = debounceUpdate(100);
browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    const lastTab = await getDebouncedTab(tab);
    console.log("browser.tabs.onUpdated, tab:", lastTab);
    void update({ activeTab: lastTab });
  }
});

// Update when the storage state changes
browser.storage.onChanged.addListener(async (changes, area) => {
  console.log("storage.onChanged, changes:", changes);
  if (area === "local" && changes.extensionIsEnabled) {
    void update({ extensionIsEnabled: changes.extensionIsEnabled.newValue });
  }
});
