import { update } from "../browser-api";

console.log("background script running");

// Update when the active tab changes
browser.tabs.onActivated.addListener(async (info) => {
  console.log("browser.tabs.onActivated, info:", info);
  void update();
});

// Update when a tab is updated (e.g., URL changes)
browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  console.log("browser.tabs.onUpdated, tab:", tab);
  if (changeInfo.status === "complete" && tab.active) {
    void update({ activeTab: tab });
  }
});

// Update when the storage state changes
browser.storage.onChanged.addListener(async (changes, area) => {
  console.log("storage.onChanged, changes:", changes);
  if (area === "local" && changes.extensionIsEnabled) {
    void update({ extensionIsEnabled: changes.extensionIsEnabled.newValue });
  }
});
