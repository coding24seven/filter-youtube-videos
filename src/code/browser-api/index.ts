import { getCurrentPageType } from "../utils";
import {
  MessagePayload,
  UpdateIconProperties,
  UpdateStateProperties,
} from "./types";

export async function isExtensionEnabled() {
  return !!(await browser.storage.local.get()).extensionIsEnabled;
}

export async function queryActiveTab() {
  const browserTabs = await browser.tabs.query({
    active: true, // only one tab (currently active one) is returned in []
    currentWindow: true,
  });
  const [activeBrowserTab] = browserTabs;

  return activeBrowserTab;
}

export async function sendMessageToContent(
  activeTabId: number | undefined,
  payload: MessagePayload,
) {
  if (typeof activeTabId !== "number") {
    console.error("missing activeTabId");

    return;
  }

  await browser.tabs.sendMessage(activeTabId, payload);
}

export async function update({
  extensionIsEnabled,
  activeTab,
}: UpdateStateProperties = {}) {
  const isEnabled = extensionIsEnabled || (await isExtensionEnabled());
  const tab = activeTab || (await queryActiveTab());
  const tabId = tab.id;
  const tabUrl = tab.url;
  const currentPageType = getCurrentPageType(tabUrl);

  if (currentPageType) {
    void sendMessageToContent(tabId, {
      extensionIsEnabled: isEnabled,
      currentPageType,
    });
  }

  void updateExtensionIcon({ extensionIsEnabled: isEnabled, tabUrl: tabUrl });
}

export async function updateExtensionIcon({
  extensionIsEnabled,
  tabUrl,
}: UpdateIconProperties) {
  const iconPath =
    extensionIsEnabled && (await contentShouldRunOnCurrentPage(tabUrl))
      ? "media/icons/extension-is-enabled.png"
      : "media/icons/extension-is-disabled.png";
  void browser.browserAction.setIcon({ path: iconPath });
}

export async function contentShouldRunOnCurrentPage(activeTabUrl?: string) {
  const url = activeTabUrl || (await queryActiveTab()).url;

  if (!url) {
    console.error("missing url for active tab");

    return false;
  }

  return getCurrentPageType(url);
}
