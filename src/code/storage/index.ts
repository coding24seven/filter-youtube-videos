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

export async function sendMessage(payload: MessagePayload) {
  const activeTab = await queryActiveTab();

  if (await extensionShouldRunOnCurrentPage(activeTab.url)) {
    await browser.tabs.sendMessage(activeTab.id!, payload);
  }
}

export function update({ extensionIsEnabled, tabUrl }: UpdateStateProperties) {
  if (extensionIsEnabled !== undefined) {
    void sendMessage({ extensionIsEnabled });
    void updateIcon({ extensionIsEnabled, tabUrl });
  }
}

export async function updateIcon({
  extensionIsEnabled,
  tabUrl,
}: UpdateIconProperties) {
  const iconPath =
    extensionIsEnabled && (await extensionShouldRunOnCurrentPage(tabUrl))
      ? "media/icons/extension-is-enabled.png"
      : "media/icons/extension-is-disabled.png";
  void browser.browserAction.setIcon({ path: iconPath });
}

export async function extensionShouldRunOnCurrentPage(activeTabUrl?: string) {
  const url = activeTabUrl || (await queryActiveTab()).url;

  if (!url) {
    console.error("missing url for active tab");

    return false;
  }

  return getCurrentPageType(url);
}
