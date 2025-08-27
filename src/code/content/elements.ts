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

    const eventBus = new EventTarget();

    const handler: EmittedNodeEventHandler = (event) => {
      console.log("event.detail.node", event.detail.node);
      let contentsElement = getContentsElement();

      if (!contentsElement) {
        return;
      }

      console.log("videos container has just loaded:", contentsElement);

      observer.deactivate();

      eventBus.removeEventListener(
        customEvents.observerEmittedNode,
        handler as EventListener,
      );

      resolve(contentsElement);
    };

    eventBus.addEventListener(
      customEvents.observerEmittedNode,
      handler as EventListener,
    );

    const observer = new Observer(document.body, eventBus);
    observer.activate();
  });
}

export function getProgressBarElementByPageType(
  currentPageType: YouTubePageTypes,
  videoElement: HTMLElement,
) {
  return videoElement.querySelector(
    selectors.progressBarSelectors[currentPageType],
  );
}

export function getMembersOnlyBadgeElement(videoElement: HTMLElement) {
  const membersOnlyBadgeElement = videoElement.querySelector(
    selectors.membersOnlyBadge,
  );

  return membersOnlyBadgeElement?.textContent ? membersOnlyBadgeElement : null;
}
