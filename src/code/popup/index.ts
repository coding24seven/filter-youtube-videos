import {
  contentShouldRunOnCurrentPage,
  getHiddenVideosCount,
  isExtensionEnabled,
  toggleExtensionIsEnabled,
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
    } else if (changes.hiddenVideosCount) {
      await setHiddenVideosCountText(changes.hiddenVideosCount.newValue);
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

    await setHiddenVideosCountText((await getHiddenVideosCount()) || 0);
    await setButtonText({ buttonElement: toggleFilterButton });

    return toggleFilterButton;
  } else {
    toggleFilterButton.style.display = "none";
    extensionShouldNotRunElement.style.display = "block";

    return extensionShouldNotRunElement;
  }
}

async function setHiddenVideosCountText(count: number) {
  const hiddenVideosCountElement = document.getElementById(
    "hidden-videos-count",
  );

  if (!hiddenVideosCountElement) {
    console.error(`Element with id 'hidden-videos-count' not found`);

    return;
  }

  hiddenVideosCountElement.textContent = `Videos Hidden: ${count}`;
}

async function setButtonText({
  buttonElement,
  extensionIsEnabled,
}: {
  buttonElement: HTMLElement;
  extensionIsEnabled?: boolean | undefined;
  hiddenVideosCount?: number;
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
