import { BrowserEvents, customEvents, youTubeEvents } from "./events";
import Observer, { EmittedNodeEventHandler } from "./observer";
import { YouTubePageTypes } from "./types";
import {
  getMembersOnlyBadgeElement,
  getProgressBarElementByPageType,
  waitForAndGetContentsElement,
} from "./elements";
import { MessagePayload } from "../browser-api/types";

export interface FiltersState {
  watchedFilterEnabled: boolean;
  membersOnlyFilterEnabled: boolean;
}

export default class Filter {
  currentYouTubePageType: YouTubePageTypes | null = null;
  watchedFilterEnabled: boolean = true;
  membersOnlyFilterEnabled: boolean = true;
  contentsElement: HTMLElement | null = null;
  allVideos: HTMLCollection | undefined;
  videoElementTagName: string | undefined;
  videosHiddenCount = 0;
  observer: Observer | null = null;
  eventBus: EventTarget | null = null;
  observerEmittedNodeHandler: EmittedNodeEventHandler | null = null;

  constructor(public filtersState: FiltersState) {
    this.establishCommunicationWithBackground();
  }

  cleanUp() {
    console.log("Cleaning up");

    if (this.observer) {
      this.observer.deactivate();
      this.observer = null;
    }
    this.eventBus?.removeEventListener(
      customEvents.observerEmittedNode,
      this.observerEmittedNodeHandler as EventListener,
    );

    this.eventBus = null;
    this.contentsElement = null;
    this.allVideos = undefined;
    this.videoElementTagName = "";
    this.videosHiddenCount = 0;
    this.currentYouTubePageType = null;
  }

  async run() {
    this.contentsElement = await waitForAndGetContentsElement();

    const { watchedFilterEnabled, membersOnlyFilterEnabled } =
      this.filtersState;

    this.watchedFilterEnabled = watchedFilterEnabled;
    this.membersOnlyFilterEnabled = membersOnlyFilterEnabled;

    this.filterAllLoadedVideos(true).catch((err: Error) => {
      console.error(err);
    });

    this.allVideos = this.contentsElement.children;
    this.videoElementTagName = this.contentsElement.firstElementChild?.tagName;

    this.observerEmittedNodeHandler = (event) => {
      console.log("before processNode--------");
      this.processNode(event.detail.node);
    };

    this.eventBus = new EventTarget();

    this.eventBus.addEventListener(
      customEvents.observerEmittedNode,
      this.observerEmittedNodeHandler as EventListener,
    );

    this.observer = new Observer(this.contentsElement, this.eventBus);
    this.observer.activate();
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
    if (!this.currentYouTubePageType) {
      return false;
    }

    let progressBarElement;

    if (this.watchedFilterEnabled) {
      progressBarElement = getProgressBarElementByPageType(
        this.currentYouTubePageType,
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

  restoreVideosVisibility(): void {
    this.filterAllLoadedVideos(false).catch((err: Error) => {
      console.error(err);
    });
  }

  establishCommunicationWithBackground() {
    // Listen for toggle messages initiated by popup and by background script, which are sent while on YouTubePageTypes pages only
    browser.runtime.onMessage.addListener(
      (message: MessagePayload, _sender, _sendResponse) => {
        const {
          tabId,
          extensionIsEnabled,
          browserEvent,
          currentYouTubePageType,
        } = message;

        console.log("Extension is enabled:", extensionIsEnabled);
        console.log("tabId", tabId);
        console.log("browser event", browserEvent);

        if (extensionIsEnabled) {
          this.cleanUp();
          this.currentYouTubePageType = currentYouTubePageType;

          if (
            [
              BrowserEvents.StorageOnChanged /* extension toggled on */,
              BrowserEvents.TabsOnActivated /* tab clicked */,
            ].includes(browserEvent)
          ) {
            void this.run();
          } else if (BrowserEvents.TabsOnUpdated === browserEvent) {
            /* url changed within a tab, by clicking on link or reloading page */
            window.addEventListener(
              youTubeEvents.ytNavigateFinish,
              (...args) => {
                console.log(youTubeEvents.ytNavigateFinish, args);
                void this.run();
              },
              { once: true },
            );
          }
        } else {
          if (
            /* extension toggled off */
            BrowserEvents.StorageOnChanged === browserEvent
          ) {
            this.restoreVideosVisibility();
            this.cleanUp();
          }
        }
      },
    );
  }
}
