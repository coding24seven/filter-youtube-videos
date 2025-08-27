import { customEvents } from "./events";
import Observer, { EmittedNodeEventHandler } from "./observer";
import { YouTubePageTypes } from "./types";
import {
  getContentsElement,
  getMembersOnlyBadgeElement,
  getProgressBarElementByPageType,
  waitForContentsElement,
} from "./selectors";
import { MessagePayload } from "../browser-api/types";

export interface FiltersState {
  watchedFilterEnabled: boolean;
  membersOnlyFilterEnabled: boolean;
}

class Filter {
  currentPageType: YouTubePageTypes | null = null;
  watchedFilterEnabled: boolean = true;
  membersOnlyFilterEnabled: boolean = true;
  contentsElement: HTMLElement | null = null;
  allVideos: HTMLCollection | undefined;
  videoElementTagName: string | undefined;
  videosHiddenCount = 0;
  observer: Observer | null = null;
  observerEmittedNodeHandler: EmittedNodeEventHandler = (event) => {
    this.processNode(event.detail.node);
  };

  constructor(public filtersState: FiltersState) {
    this.establishCommunicationWithBackground();
  }

  async run() {
    this.contentsElement = getContentsElement();

    if (this.contentsElement) {
      console.log("videos container found:", this.contentsElement);
    } else {
      console.log(
        "videos container element not in the DOM yet. Waiting for it to load...",
      );
      this.contentsElement = await waitForContentsElement();
      console.log("videos container has just loaded:", this.contentsElement);
    }

    const { watchedFilterEnabled, membersOnlyFilterEnabled } =
      this.filtersState;

    this.watchedFilterEnabled = watchedFilterEnabled;
    this.membersOnlyFilterEnabled = membersOnlyFilterEnabled;

    this.filterAllLoadedVideos(true).catch((err: Error) => {
      console.error(err);
    });

    this.allVideos = this.contentsElement.children;
    this.videoElementTagName = this.contentsElement.firstElementChild?.tagName;

    /* this element doubles as event bus */
    this.contentsElement?.addEventListener(
      customEvents.observerEmittedNode,
      this.observerEmittedNodeHandler as EventListener,
    );

    this.observer = new Observer(this.contentsElement);
    this.observer.activate();
  }

  cleanUp() {
    if (this.observer) {
      this.observer.deactivate();
      this.observer = null;
    }

    if (this.contentsElement) {
      this.contentsElement.removeEventListener(
        customEvents.observerEmittedNode,
        this.observerEmittedNodeHandler as EventListener,
      );
    }

    this.contentsElement = null;
    this.allVideos = undefined;
    this.videoElementTagName = "";
    this.videosHiddenCount = 0;
  }

  processNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const triggeringElement = node as HTMLElement;

    const videoElement = triggeringElement.closest(
      `${this.videoElementTagName}`,
    ) as HTMLElement;

    if (!videoElement) {
      return;
    }

    if (this.shouldFilterOutVideo(videoElement)) {
      this.switchVideoVisibility(videoElement as HTMLElement, false);
    }
  }

  shouldFilterOutVideo(videoElement: HTMLElement): boolean {
    if (!this.currentPageType) {
      return false;
    }

    let progressBarElement;

    if (this.watchedFilterEnabled) {
      progressBarElement = getProgressBarElementByPageType(
        this.currentPageType,
        videoElement,
      );
    }

    let membersOnlyBadgeElement;

    if (this.membersOnlyFilterEnabled) {
      membersOnlyBadgeElement = getMembersOnlyBadgeElement(videoElement);
    }

    return !!(progressBarElement || membersOnlyBadgeElement);
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
  }

  filterVideo(videoElement: HTMLElement) {
    if (this.shouldFilterOutVideo(videoElement)) {
      this.switchVideoVisibility(videoElement, false);
    } else {
      this.switchVideoVisibility(videoElement, true);
    }
  }

  async filterAllLoadedVideos(extensionIsEnabled: boolean) {
    if (!this.contentsElement) return;

    const videoElements = this.contentsElement.children;

    if (extensionIsEnabled) {
      for (const videoElement of videoElements) {
        this.filterVideo(videoElement as HTMLElement);
      }
    } else {
      for (const videoElement of videoElements) {
        this.switchVideoVisibility(videoElement as HTMLElement, true);
      }
    }
  }

  restoreVideos(): void {
    this.filterAllLoadedVideos(false).catch((err: Error) => {
      console.error(err);
    });

    this.cleanUp();
  }

  establishCommunicationWithBackground() {
    // Listen for toggle messages from popup
    browser.runtime.onMessage.addListener((message: MessagePayload) => {
      const { extensionIsEnabled, currentPageType } = message;

      console.log("Extension is enabled:", extensionIsEnabled);

      this.currentPageType = currentPageType;

      if (extensionIsEnabled) {
        void this.run();
      } else {
        this.restoreVideos();
      }
    });
  }
}

new Filter({ watchedFilterEnabled: true, membersOnlyFilterEnabled: true });
