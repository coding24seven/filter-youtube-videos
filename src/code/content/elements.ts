import Observer, { EmittedNodeEventHandler } from "./observer";
import { customEvents } from "./events";
import { YouTubePageTypes } from "./types";
import { selectors } from "./selectors";

export function getContentsElement() {
  return document.getElementById(selectors.videosContainer);
}

export function waitForAndGetContentsElement(): Promise<HTMLElement> {
  return new Promise((resolve, _reject) => {
    let contentsElement = getContentsElement();

    if (contentsElement) {
      console.log(
        "videos container found, already in the DOM:",
        contentsElement,
      );

      resolve(contentsElement);

      return;
    }

    console.log(
      "videos container element not in the DOM yet. Waiting for it to load...",
    );

    const handler: EmittedNodeEventHandler = (_event) => {
      let contentsElement = getContentsElement();

      if (!contentsElement) {
        return;
      }

      console.log("videos container has just loaded:", contentsElement);

      observer.deactivate();
      eventBusForObserver.removeEventListener(...args);

      resolve(contentsElement);
    };

    const eventBusForObserver = new EventTarget();
    const args: [string, EventListener] = [
      customEvents.observerEmittedNode,
      handler as EventListener,
    ];

    eventBusForObserver.addEventListener(...args);

    const observer = new Observer(document.body, eventBusForObserver);
    observer.activate();
  });
}

export function getProgressBarElementByPageType(
  currentYouTubePageType: YouTubePageTypes,
  videoElement: HTMLElement,
) {
  return videoElement.querySelector(
    selectors.progressBarSelectors[currentYouTubePageType],
  );
}

export function getMembersOnlyBadgeElement(videoElement: HTMLElement) {
  const membersOnlyBadgeElement = videoElement.querySelector(
    selectors.membersOnlyBadge,
  );

  return membersOnlyBadgeElement?.textContent ? membersOnlyBadgeElement : null;
}

export function setElementVisibility(element: HTMLElement, hide: boolean) {
  if (hide) {
    element.style.display = "none";
  } else {
    element.style.display = "";
  }
}

export function isElementHidden(element: HTMLElement) {
  return element.style.display === "none";
}

export function getVideoCount() {
  return getContentsElement()?.childElementCount || 0;
}

export function getHiddenVideoCount() {
  const contentsElement = getContentsElement();
  const initialValue = 0;

  if (!contentsElement) {
    return initialValue;
  }

  return [
    ...(contentsElement.children as HTMLCollectionOf<HTMLElement>),
  ].reduce((acc: number, element) => {
    return isElementHidden(element) ? ++acc : acc;
  }, initialValue);
}
