import Observer, { EmittedNodeEventHandler } from "./observer";
import { customEvents } from "./events";
import { YouTubePageTypes } from "./types";
import { selectors } from "./selectors";

export function getContentsElement() {
  return document.getElementById(selectors.videosContainer);
}

export function waitForAndGetContentsElement(): Promise<
  [HTMLElement, () => void]
> {
  return new Promise((resolve, _reject) => {
    let contentsElement = getContentsElement();
    const cleanUpProcedure = () => {
      contentsElement = null;
    };

    if (contentsElement) {
      console.log(
        "videos container found, already in the DOM:",
        contentsElement,
      );

      resolve([contentsElement, cleanUpProcedure]);

      return;
    }

    console.log(
      "videos container element not in the DOM yet. Waiting for it to load...",
    );

    const eventBus = new EventTarget();

    const handler: EmittedNodeEventHandler = (event) => {
      console.log(
        "waitForAndGetContentsElement, event.detail.node",
        event.detail.node,
      );
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

      resolve([contentsElement, cleanUpProcedure]);
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
