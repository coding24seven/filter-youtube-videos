import { getCurrentYouTubePageType } from "../utils/youtube";
import {
  MessagePayload,
  State,
  UpdateIconProperties,
  UpdateStateProperties,
} from "./types";
import { BrowserEvents } from "../content/events";
import Tab = browser.tabs.Tab;

export function loadState() {
  return browser.storage.local.get() as Promise<State>;
}

export async function setState(state: Partial<State>) {
  return browser.storage.local.set(state);
}

export async function isExtensionEnabled() {
  return !!(await loadState()).extensionIsEnabled;
}

export async function toggleExtensionIsEnabled() {
  return setState({
    extensionIsEnabled: !(await isExtensionEnabled()),
  });
}

export async function loadVideoCount() {
  return (await loadState()).videoCount;
}

export function updateVideoCount(videoCount: number) {
  return setState({ videoCount });
}

export async function loadHiddenVideoCount() {
  return (await loadState()).hiddenVideoCount;
}

export function updateHiddenVideoCount(hiddenVideoCount: number) {
  return setState({ hiddenVideoCount });
}

export async function queryActiveTab() {
  const browserTabs = (await browser.tabs.query({
    active: true,
    currentWindow: true,
  })) as [Tab];
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

export async function update(
  { extensionIsEnabled, browserEvent, activeTab }: UpdateStateProperties = {
    browserEvent: BrowserEvents.StorageOnChanged,
  },
) {
  const isEnabled = extensionIsEnabled || (await isExtensionEnabled());
  const tab = activeTab || (await queryActiveTab());
  const tabId = tab.id;
  const tabUrl = tab.url;
  const currentYouTubePageType = getCurrentYouTubePageType(tabUrl);

  if (currentYouTubePageType) {
    void sendMessageToContent(tabId, {
      browserEvent,
      extensionIsEnabled: isEnabled,
      tabId,
      currentYouTubePageType: currentYouTubePageType,
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

  return getCurrentYouTubePageType(url);
}
