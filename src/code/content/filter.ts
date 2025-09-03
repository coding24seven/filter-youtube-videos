import { BrowserEvents, customEvents, youTubeEvents } from "./events";
import Observer, { EmittedNodeEventHandler } from "./observer";
import { YouTubePageTypes } from "./types";
import {
  getContentsElement,
  getMembersOnlyBadgeElement,
  getProgressBarElementByPageType,
  setElementVisibility,
  waitForAndGetContentsElement,
} from "./elements";
import { MessagePayload } from "../browser-api/types";
import { getCurrentYouTubePageType } from "../utils";
import { isExtensionEnabled, updateHiddenVideosCount } from "../browser-api";

export interface FiltersState {
  watchedFilterEnabled: boolean;
  membersOnlyFilterEnabled: boolean;
}

export default class Filter {
  currentYouTubePageType: YouTubePageTypes | null = null;
  watchedFilterEnabled: boolean = true;
  membersOnlyFilterEnabled: boolean = true;
  videoElementsProcessedByObserver = new Set();
  hiddenVideosCount = 0;
  incrementHiddenVideosCount = this.incrementHiddenVideosCountDebounced();
  cleanUpProcedures: (() => void)[] = [];

  public constructor(public filtersState: FiltersState) {
    this.setUpYtNavigateFinishEventListener();
    this.establishCommunicationWithBackground();
  }

  private async cleanUp() {
    console.log("Cleaning up");
    this.cleanUpProcedures.forEach((procedure) => {
      procedure();
    });

    this.currentYouTubePageType = null;
    this.videoElementsProcessedByObserver.clear();
    this.hiddenVideosCount = 0;
    return updateHiddenVideosCount(0);
  }

  private async run(currentYouTubePageType?: YouTubePageTypes) {
    console.log("*** Running filter ***");
    const contentsElement = await waitForAndGetContentsElement();

    const { watchedFilterEnabled, membersOnlyFilterEnabled } =
      this.filtersState;

    this.watchedFilterEnabled = watchedFilterEnabled;
    this.membersOnlyFilterEnabled = membersOnlyFilterEnabled;
    this.currentYouTubePageType =
      currentYouTubePageType || getCurrentYouTubePageType(window.location.href);

    this.filterAllLoadedVideos().catch((err: Error) => {
      console.error(err);
    });

    let videoElementTagName: string | undefined;

    const handler: EmittedNodeEventHandler = (event) => {
      if (!contentsElement) {
        console.error(`observerEmittedNodeHandler(): contentElement missing`);
        return;
      }

      if (!contentsElement.firstElementChild) {
        console.error(
          `observerEmittedNodeHandler(): contentElement.firstElementChild missing`,
        );
        return;
      }

      videoElementTagName =
        videoElementTagName || contentsElement.firstElementChild.tagName;
      this.processNode(event.detail.node, videoElementTagName);
    };

    const eventBusForObserver = new EventTarget();
    const args: [string, EventListener] = [
      customEvents.observerEmittedNode,
      handler as EventListener,
    ];

    eventBusForObserver.addEventListener(...args);
    this.cleanUpProcedures.push(() => {
      eventBusForObserver.removeEventListener(...args);
    });

    const observer: Observer = new Observer(
      contentsElement,
      eventBusForObserver,
    );
    observer.activate();
    this.cleanUpProcedures.push(() => {
      observer.deactivate();
    });
  }

  private processNode(node: Node, videoElementTagName: string) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const triggeringElement = node as HTMLElement;

    const videoElement = triggeringElement.closest(
      videoElementTagName,
    ) as HTMLElement;

    if (!videoElement) {
      return;
    }

    if (this.videoElementsProcessedByObserver.has(videoElement)) {
      return;
    }

    this.videoElementsProcessedByObserver.add(videoElement);

    if (this.shouldHideVideo(videoElement)) {
      this.hideVideo(videoElement);
    }
  }

  private shouldHideVideo(videoElement: HTMLElement) {
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

  private incrementHiddenVideosCountDebounced() {
    let timeout: NodeJS.Timeout;

    return () => {
      this.hiddenVideosCount++;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        void updateHiddenVideosCount(this.hiddenVideosCount);
      }, 100);
    };
  }

  private hideVideo(videoElement: HTMLElement) {
    this.incrementHiddenVideosCount();
    setElementVisibility(videoElement, true);
  }

  private showVideo(videoElement: HTMLElement) {
    // todo: decrement count if not resetting all to 0
    setElementVisibility(videoElement, false);
  }

  private async filterAllLoadedVideos() {
    const contentsElement = getContentsElement();
    if (!contentsElement) return;

    const extensionIsEnabled = await isExtensionEnabled();

    const videoElements =
      contentsElement.children as HTMLCollectionOf<HTMLElement>;

    for (const videoElement of videoElements) {
      if (extensionIsEnabled && this.shouldHideVideo(videoElement)) {
        this.hideVideo(videoElement);
      } else {
        this.showVideo(videoElement);
      }
    }
  }

  /* url changed within a tab, by clicking on link or reloading page */
  private setUpYtNavigateFinishEventListener() {
    const handler = async (event: Event) => {
      console.log(youTubeEvents.ytNavigateFinish, "event:", event);

      if (!(await isExtensionEnabled())) {
        return;
      }

      console.log("before cleanup", getContentsElement()?.childElementCount);
      void this.filterAllLoadedVideos();
      await this.cleanUp();
      // todo: optimize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("after cleanup", getContentsElement()?.childElementCount);

      void this.run();
    };

    window.addEventListener(youTubeEvents.ytNavigateFinish, handler);
  }

  private establishCommunicationWithBackground() {
    // Listen for toggle messages initiated by popup and by background script, which are sent while on YouTubePageTypes pages only
    browser.runtime.onMessage.addListener(
      async (message: MessagePayload, _sender, _sendResponse) => {
        const {
          tabId,
          extensionIsEnabled,
          browserEvent,
          currentYouTubePageType,
        } = message;

        console.log("Extension is enabled:", extensionIsEnabled);
        console.log("tabId:", tabId);
        console.log("browser event:", browserEvent);

        if (
          extensionIsEnabled &&
          [
            BrowserEvents.StorageOnChanged /* extension toggled on */,
            BrowserEvents.TabsOnActivated /* tab clicked */,
          ].includes(browserEvent)
        ) {
          await this.cleanUp();
          void this.run(currentYouTubePageType);

          return;
        }

        if (
          extensionIsEnabled &&
          BrowserEvents.TabsOnUpdated === browserEvent
        ) {
          /* ignore as navigation to new url is handled via setUpYtNavigateFinishEventListener method */
          return;
        }

        if (
          /* extension toggled off */
          !extensionIsEnabled &&
          BrowserEvents.StorageOnChanged === browserEvent
        ) {
          void this.filterAllLoadedVideos();
          await this.cleanUp();
        }
      },
    );
  }
}
