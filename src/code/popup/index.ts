import {
  contentShouldRunOnCurrentPage,
  loadHiddenVideoCount,
  isExtensionEnabled,
  toggleExtensionIsEnabled,
  loadVideoCount,
} from "../browser-api";
import { selectors } from "./selectors";

async function main() {
  const popupElement = await getPopupElement();

  if (popupElement?.matches(`#${selectors.toggleFilterButtonId}`)) {
    await addEventListeners(popupElement);
  }
}

async function addEventListeners(buttonElement: HTMLElement) {
  buttonElement.addEventListener("click", toggleExtensionIsEnabled);

  // Update when the storage state changes, while popup is open
  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") {
      return;
    }

    if (changes.extensionIsEnabled) {
      await setButtonText({
        buttonElement,
        extensionIsEnabled: changes.extensionIsEnabled.newValue,
      });
    } else if (changes.videoCount) {
      await setVideoCountText(changes.videoCount.newValue);
    } else if (changes.hiddenVideoCount) {
      await setHiddenVideoCountText(changes.hiddenVideoCount.newValue);
    }
  });
}

async function getPopupElement() {
  const toggleFilterButton = document.getElementById(
    selectors.toggleFilterButtonId,
  );
  const extensionShouldNotRunElement = document.getElementById(
    selectors.extensionShouldNotRunElementId,
  );

  if (!toggleFilterButton || !extensionShouldNotRunElement) {
    console.error("required HTML elements not found in popup.html");

    return;
  }

  if (await contentShouldRunOnCurrentPage()) {
    extensionShouldNotRunElement.style.display = "none";
    toggleFilterButton.style.display = "block";

    await setVideoCountText((await loadVideoCount()) || 0);
    await setHiddenVideoCountText((await loadHiddenVideoCount()) || 0);
    await setButtonText({ buttonElement: toggleFilterButton });

    return toggleFilterButton;
  } else {
    toggleFilterButton.style.display = "none";
    extensionShouldNotRunElement.style.display = "block";

    return extensionShouldNotRunElement;
  }
}

async function setVideoCountText(count: number) {
  const selector = "video-count";
  const videoCountElement = document.getElementById(selector);

  if (!videoCountElement) {
    console.error(`Element with id ${selector} not found`);

    return;
  }

  videoCountElement.textContent = `Videos total: ${count}`;
}

async function setHiddenVideoCountText(count: number) {
  const selector = "hidden-video-count";
  const hiddenVideoCountElement = document.getElementById(selector);

  if (!hiddenVideoCountElement) {
    console.error(`Element with id ${selector} not found`);

    return;
  }

  hiddenVideoCountElement.textContent = `Videos Hidden: ${count}`;
}

async function setButtonText({
  buttonElement,
  extensionIsEnabled,
}: {
  buttonElement: HTMLElement;
  extensionIsEnabled?: boolean | undefined;
  hiddenVideoCount?: number;
}) {
  const enableText = "Hide Unwanted Videos";
  const disableText = "Show All Videos";

  buttonElement.textContent =
    typeof extensionIsEnabled === "boolean"
      ? extensionIsEnabled
        ? disableText
        : enableText
      : (await isExtensionEnabled())
        ? disableText
        : enableText;
}

void main();
