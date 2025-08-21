import { customEvents, youTubeEvents } from "./events";
import Observer from "./observer";
import { selectors } from "./selectors";
import { isExtensionEnabled } from "../utils";

export interface FiltersState {
  watchedFilterEnabled: boolean;
  membersOnlyFilterEnabled: boolean;
}

class Filter {
  watchedFilterEnabled: boolean = true;
  membersOnlyFilterEnabled: boolean = true;
  allVideosContainerElement: HTMLElement | null = null;
  allVideosElementCollection: HTMLCollection | undefined;
  singleVideoContainerElementTagName: string | undefined = "";
  videosHiddenCount = 0;
  url = "";
  observer: Observer | null = null;
  observerEmittedNodeHandler: (event: CustomEvent<{ node: Node }>) => void = (
    event,
  ) => {
    this.processNode(event.detail.node);
  };
  ytNavigateFinishHandler: EventListener = (_event) => {};

  constructor(filtersState: FiltersState) {
    this.establishCommunicationWithExtensionToggle();

    isExtensionEnabled().then((isEnabled) => {
      if (isEnabled) {
        this.ytNavigateFinishHandler = (_event) => {
          this.run(filtersState);
        };
        window.addEventListener(
          youTubeEvents.ytNavigateFinish,
          this.ytNavigateFinishHandler,
        );
      }
    });
  }

  run(
    filtersState: FiltersState = {
      watchedFilterEnabled: true,
      membersOnlyFilterEnabled: true,
    },
  ) {
    this.url = window.location.href;
    console.log("in content scrip, url", this.url);
    if (!this.url.includes("youtube.com/@")) {
      return;
    }

    const { watchedFilterEnabled, membersOnlyFilterEnabled } = filtersState;

    this.watchedFilterEnabled = watchedFilterEnabled;
    this.membersOnlyFilterEnabled = membersOnlyFilterEnabled;

    this.allVideosContainerElement = document.getElementById(
      selectors.videosContainer,
    );

    if (!this.allVideosContainerElement) {
      return;
    }

    this.filterAllVideos().catch((err: Error) => {
      console.error(err);
    });

    this.allVideosElementCollection = this.allVideosContainerElement.children;
    this.singleVideoContainerElementTagName =
      this.allVideosContainerElement.firstElementChild?.tagName;

    this.allVideosContainerElement?.addEventListener(
      customEvents.observerEmittedNode,
      this.observerEmittedNodeHandler as EventListener,
    );

    this.observer = new Observer(this.allVideosContainerElement);
    this.observer.activateObserver();
  }

  cleanUp() {
    if (this.observer) {
      this.observer.deactivateObserver();
      this.observer = null;
      console.log("Observer terminated");
    }

    window.removeEventListener(
      youTubeEvents.ytNavigateFinish,
      this.ytNavigateFinishHandler,
    );

    if (this.allVideosContainerElement) {
      this.allVideosContainerElement.removeEventListener(
        customEvents.observerEmittedNode,
        this.observerEmittedNodeHandler as EventListener,
      );
    }

    this.allVideosContainerElement = null;
    this.allVideosContainerElement = null;
    this.allVideosElementCollection = undefined;
    this.singleVideoContainerElementTagName = "";
    this.videosHiddenCount = 0;
  }

  triggeringElementShouldFilterOutVideo(element: HTMLElement) {
    if (this.membersOnlyFilterEnabled) {
      const shouldFilterOutMembersOnlyVideo =
        element.tagName.toLowerCase() === "div" &&
        element.classList.contains(selectors.membersOnlyBadgeClassName) &&
        element.textContent; // todo fix textContent check, also try to use matches() instead

      if (shouldFilterOutMembersOnlyVideo) {
        return true;
      }
    }

    if (this.watchedFilterEnabled) {
      const isWatchedElement = element.matches(selectors.watchedBadge); // doesn't seem to be any of these cases
      const isProgressBarElement = element.matches(
        selectors.progressBarSelector,
      );

      const shouldFilterOutWatchedVideo =
        isWatchedElement || isProgressBarElement;

      if (shouldFilterOutWatchedVideo) {
        return true;
      }
    }

    return false;
  }

  processNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;

    if (this.triggeringElementShouldFilterOutVideo(element)) {
      const videoElement = element.closest(
        `${this.singleVideoContainerElementTagName}`,
      );
      this.switchVideoVisibility(videoElement as HTMLElement, false);
    }
  }

  switchVideoVisibility(videoElement: HTMLElement, makeVideoVisible: boolean) {
    const videoIsCurrentlyInvisible = videoElement.style.display === "none";
    const videoAlreadyHasDesiredVisibility =
      (videoIsCurrentlyInvisible && !makeVideoVisible) ||
      (!videoIsCurrentlyInvisible && makeVideoVisible);

    if (videoAlreadyHasDesiredVisibility) {
      return;
    }

    if (makeVideoVisible) {
      videoElement.style.display = "";
    } else {
      this.videosHiddenCount++;
      videoElement.style.display = "none";
    }

    console.log("Videos hidden: ", this.videosHiddenCount);
  }

  filterVideo(videoElement: HTMLElement) {
    const progressBar = videoElement.querySelector(
      selectors.progressBarSelector,
    );
    const watchedBadge = videoElement.querySelector(selectors.watchedBadge);
    const membersOnlyBadge = videoElement.querySelector(
      `div.${selectors.membersOnlyBadgeClassName}`,
    );
    const membersOnlyBadgeText = membersOnlyBadge?.textContent;
    console.log("membersOnlyBadgeText", membersOnlyBadgeText);
    console.log("membersOnlyBadge", membersOnlyBadge);

    if (progressBar || watchedBadge || membersOnlyBadgeText) {
      this.switchVideoVisibility(videoElement, false);
    } else {
      this.switchVideoVisibility(videoElement, true);
    }
  }

  async filterAllVideos() {
    if (!this.allVideosContainerElement) return;

    const videoElements = this.allVideosContainerElement.children;

    if (await isExtensionEnabled()) {
      for (const videoElement of videoElements) {
        this.filterVideo(videoElement as HTMLElement);
      }
    } else {
      for (const videoElement of videoElements) {
        this.switchVideoVisibility(videoElement as HTMLElement, true);
      }
    }
  }

  establishCommunicationWithExtensionToggle() {
    // Listen for toggle messages from popup
    browser.runtime.onMessage.addListener(
      (message: { extensionIsEnabled: boolean }) => {
        const { extensionIsEnabled } = message;

        console.log("Extension enabled by toogle:", extensionIsEnabled);

        if (extensionIsEnabled) {
          this.run();
        } else {
          this.filterAllVideos().catch((err: Error) => {
            console.error(err);
          });
          this.cleanUp();
        }
      },
    );
  }
}

new Filter({ watchedFilterEnabled: true, membersOnlyFilterEnabled: true });
