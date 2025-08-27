import { YouTubePageTypes } from "./types";
import Observer, { EmittedNodeEventHandler } from "./observer";
import { customEvents } from "./events";

const { HomePage, WatchPage, VideosPage, StreamsPage } = YouTubePageTypes;

const progressBarSegmentSelector =
  '*[class*="ProgressBarSegment" i][style*="width"]';
const progressIdSelector = '#progress[style*="width"]';

export const selectors = {
  videosContainer: "contents",
  progressBarSelectors: {
    [HomePage]: progressBarSegmentSelector,
    [WatchPage]: progressBarSegmentSelector,
    [VideosPage]: progressIdSelector,
    [StreamsPage]: progressIdSelector,
  },
  membersOnlyBadge: "p.ytd-badge-supported-renderer",
};

export function getContentsElement() {
  return document.getElementById(selectors.videosContainer);
}

export function waitForContentsElement(): Promise<HTMLElement> {
  return new Promise((resolve, _reject) => {
    const eventBusElement = document.body;
    const observer = new Observer(eventBusElement);
    observer.activate();

    const handler: EmittedNodeEventHandler = (event) => {
      console.log("event.detail.node", event.detail.node);
      const contentsElement = getContentsElement();

      if (!contentsElement) {
        return;
      }

      observer.deactivate();
      eventBusElement.removeEventListener(
        customEvents.observerEmittedNode,
        handler as EventListener,
      );
      resolve(contentsElement);
    };

    eventBusElement.addEventListener(
      customEvents.observerEmittedNode,
      handler as EventListener,
    );
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
