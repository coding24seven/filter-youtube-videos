export async function isExtensionEnabled() {
  return !!(await browser.storage.local.get()).extensionIsEnabled;
}

interface MessagePayload {
  extensionIsEnabled: boolean;
}

interface UpdateIconProperties {
  extensionIsEnabled?: boolean;
  tabUrl?: string;
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
  const activeBrowserTab = await queryActiveTab();

  await browser.tabs.sendMessage(activeBrowserTab.id!, payload);
}

export async function updateIcon({
  extensionIsEnabled,
  tabUrl,
}: UpdateIconProperties) {
  const iconPath =
    extensionIsEnabled && (await shouldRunOnCurrentPage(tabUrl))
      ? "media/icons/extension-is-enabled.png"
      : "media/icons/extension-is-disabled.png";
  void browser.browserAction.setIcon({ path: iconPath });
}

async function shouldRunOnCurrentPage(activeTabUrl: string | undefined) {
  const youTubePath = "youtube.com/@";

  if (activeTabUrl) {
    return !!activeTabUrl?.includes(youTubePath);
  } else {
    const activeTab = await queryActiveTab();
    return !!activeTab.url?.includes(youTubePath);
  }
}
