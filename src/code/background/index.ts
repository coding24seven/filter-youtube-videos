import { isExtensionEnabled, sendMessage, updateIcon } from "../utils";

interface UpdateStateProperties {
  extensionIsEnabled?: boolean;
  tabUrl?: string;
}

function update({ extensionIsEnabled, tabUrl }: UpdateStateProperties) {
  if (extensionIsEnabled !== undefined) {
    void sendMessage({ extensionIsEnabled });
    void updateIcon({ extensionIsEnabled, tabUrl });
  }
}

// Update when the active tab changes
browser.tabs.onActivated.addListener(async (info) => {
  console.log("onActivated, tab , info:", info);
  update({ extensionIsEnabled: await isExtensionEnabled() });
});

// Update when a tab is updated (e.g., URL changes)
browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  console.log("onUpdated, tab.", tab);
  if (changeInfo.status === "complete" && tab.active) {
    update({ extensionIsEnabled: await isExtensionEnabled(), tabUrl: tab.url });
  }
});

// Update when the storage state changes
browser.storage.onChanged.addListener(async (changes, area) => {
  console.log("onChanged, for storage.");
  if (area === "local" && changes.extensionIsEnabled) {
    update({ extensionIsEnabled: changes.extensionIsEnabled.newValue });
  }
});
