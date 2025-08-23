import { customEvents } from "./events";
import Observer, { EmittedNodeEventHandler } from "./observer";
import { isExtensionEnabled } from "../storage";
import { getCurrentPageType } from "../utils";
import { YouTubePageTypes } from "./types";
import {
  getContentsElement,
  getMembersOnlyBadgeElement,
  getProgressBarElementByPageType,
  waitForContentsElement,
} from "./selectors";

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
    this.establishCommunicationWithExtensionToggle();

    isExtensionEnabled().then((isEnabled) => {
      if (isEnabled) {
        void this.run();
      }
    });
  }

  async run() {
    this.contentsElement = getContentsElement();

    if (this.contentsElement) {
      console.log("videos container found:", this.contentsElement);
    } else {
      console.log("videos container element not in the DOM yet. Waiting...");
    }

    if (!this.contentsElement) {
      this.contentsElement = await waitForContentsElement();
    }

    this.currentPageType = getCurrentPageType(window.location.href);

    if (this.currentPageType) {
      console.log("Extension may run on this page type");
    } else {
      console.log("Extension should not run on this page type");
      return;
    }

    const { watchedFilterEnabled, membersOnlyFilterEnabled } =
      this.filtersState;

    this.watchedFilterEnabled = watchedFilterEnabled;
    this.membersOnlyFilterEnabled = membersOnlyFilterEnabled;

    this.filterAllLoadedVideos().catch((err: Error) => {
      console.error(err);
    });

    this.allVideos = this.contentsElement.children;
    this.videoElementTagName = this.contentsElement.firstElementChild?.tagName;

    this.contentsElement?.addEventListener(
      customEvents.observerEmittedNode,
      this.observerEmittedNodeHandler as EventListener,
    );

    this.observer = new Observer(this.contentsElement);
    this.observer.activateObserver();
  }

  cleanUp() {
    if (this.observer) {
      this.observer.deactivateObserver();
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
    if (node.nodeType !== Node.ELEMENT_NODE || !this.currentPageType) {
      return;
    }

    const triggeringElement = node as HTMLElement;

    const videoElement = triggeringElement.closest(
      `${this.videoElementTagName}`,
    ) as HTMLElement;

    if (!videoElement) {
      return;
    }

    if (this.shouldHideVideo(videoElement)) {
      this.switchVideoVisibility(videoElement as HTMLElement, false);
    }
  }

  shouldHideVideo(videoElement: HTMLElement): boolean {
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
    if (this.shouldHideVideo(videoElement)) {
      this.switchVideoVisibility(videoElement, false);
    } else {
      this.switchVideoVisibility(videoElement, true);
    }
  }

  async filterAllLoadedVideos() {
    if (!this.contentsElement) return;

    const videoElements = this.contentsElement.children;

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
          void this.run();
        } else {
          this.filterAllLoadedVideos().catch((err: Error) => {
            console.error(err);
          });
          this.cleanUp();
        }
      },
    );
  }
}

new Filter({ watchedFilterEnabled: true, membersOnlyFilterEnabled: true });
