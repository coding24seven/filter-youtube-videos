import { isExtensionEnabled } from "../utils";

async function main() {
  const toggleFilterButton = document.getElementById("toggleFilter");

  if (!toggleFilterButton) {
    console.error("Toggle filter button not found in popup.html");
    return;
  }

  // Update when the storage state changes
  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area === "local" && changes.extensionIsEnabled) {
      toggleFilterButton.textContent = changes.extensionIsEnabled.newValue
        ? disableText
        : enableText;
    }
  });

  const extensionIsEnabled = await isExtensionEnabled();
  const enableText = "Hide Unwanted Videos";
  const disableText = "Show All Videos";

  toggleFilterButton.textContent = extensionIsEnabled
    ? disableText
    : enableText;

  toggleFilterButton.addEventListener("click", async () => {
    const extensionIsEnabled = await isExtensionEnabled();

    await browser.storage.local.set({
      extensionIsEnabled: !extensionIsEnabled,
    });
  });
}

void main();
