import {
  contentShouldRunOnCurrentPage,
  isExtensionEnabled,
} from "../browser-api";
import { selectors } from "./selectors";

async function main() {
  const popupElement = await getPopupElement();

  if (popupElement?.matches(`#${selectors.toggleFilterButtonId}`)) {
    await addEventListeners(popupElement);
  }
}

async function addEventListeners(buttonElement: HTMLElement) {
  buttonElement.addEventListener("click", async () => {
    await browser.storage.local.set({
      extensionIsEnabled: !(await isExtensionEnabled()),
    });
  });

  // Update when the storage state changes
  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area === "local" && changes.extensionIsEnabled) {
      await setButtonText(buttonElement, changes.extensionIsEnabled.newValue);
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

  console.log(
    "await extensionShouldRunOnCurrentPage()",
    await contentShouldRunOnCurrentPage(),
  );

  if (await contentShouldRunOnCurrentPage()) {
    extensionShouldNotRunElement.style.display = "none";
    toggleFilterButton.style.display = "block";

    await setButtonText(toggleFilterButton);

    return toggleFilterButton;
  } else {
    toggleFilterButton.style.display = "none";
    extensionShouldNotRunElement.style.display = "block";

    return extensionShouldNotRunElement;
  }
}

async function setButtonText(
  buttonElement: HTMLElement,
  extensionIsEnabled?: boolean,
) {
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
