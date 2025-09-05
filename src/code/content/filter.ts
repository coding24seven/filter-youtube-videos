import { BrowserEvents, customEvents, youTubeEvents } from "./events";
import Observer, { EmittedNodeEventHandler } from "./observer";
import { YouTubePageTypes } from "./types";
import {
  getContentsElement,
  getHiddenVideoCount,
  getMembersOnlyBadgeElement,
  getProgressBarElementByPageType,
  getVideoCount,
  setElementVisibility,
  waitForAndGetContentsElement,
  waitForContentsElementToStopMutating,
} from "./elements";
import { MessagePayload } from "../browser-api/types";
import { getCurrentYouTubePageType } from "../utils/youtube";
import {
  isExtensionEnabled,
  updateHiddenVideoCount,
  updateVideoCount,
} from "../browser-api";
import { debounce, runAtIntervalFor } from "../utils";

export interface FiltersState {
  watchedFilterEnabled: boolean;
  membersOnlyFilterEnabled: boolean;
}

export default class Filter {
  currentYouTubePageType: YouTubePageTypes | null = null;
  watchedFilterEnabled: boolean = true;
  membersOnlyFilterEnabled: boolean = true;
  videoElementsProcessedByObserver = new Set();
  updateVideoCount = debounce(() => {
    void updateVideoCount(getVideoCount());
  }, 100);
  updateHiddenVideoCount = debounce(() => {
    void updateHiddenVideoCount(getHiddenVideoCount());
  }, 100);
  cleanUpProcedures: (() => void)[] = [];

  public constructor(public filtersState: FiltersState) {
    this.setUpYtNavigateFinishEventListener();
    this.establishCommunicationWithBackground();
  }

  private cleanUp() {
    this.cleanUpProcedures.forEach((procedure) => {
      procedure();
    });

    this.currentYouTubePageType = null;
    console.info(
      `Clearing ${this.videoElementsProcessedByObserver.size} video elements processed by observer`,
    );
    this.videoElementsProcessedByObserver.clear();
    console.info("Cleaned up");
  }

  private async run(currentYouTubePageType?: YouTubePageTypes) {
    console.info("*** Running filter ***");
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
    this.updateVideoCount();
    this.updateHiddenVideoCount();

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

  private hideVideo(videoElement: HTMLElement) {
    this.updateHiddenVideoCount();
    setElementVisibility(videoElement, true);
  }

  private showVideo(videoElement: HTMLElement) {
    this.updateHiddenVideoCount();
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
  /* There is no straightforward way to determine when new-page videos have fully replaced previous-page videos on SPA (non-page-reload) navigation. erroneously, YouTube dispatches this event before DOM mutations have completed, which means that at this point the contents element may contain stale video elements from previous url, and video count is usually incorrect until the DOM stops mutating, which is not predictable because long pauses may occur between mutations */
  private setUpYtNavigateFinishEventListener() {
    const handler = async (event: Event) => {
      console.info(youTubeEvents.ytNavigateFinish, "event:", event);

      if (!(await isExtensionEnabled())) {
        return;
      }

      this.cleanUp();
      await waitForContentsElementToStopMutating(
        100,
      ); /* does not guarantee much as mutations may resume */
      void this.run();

      runAtIntervalFor(
        () => {
          console.info("updating count");
          this.updateVideoCount();
          this.updateHiddenVideoCount();
        },
        300,
        10000,
      ); /* there is no predictable way to determine when contents ceased mutating, so run it for a while */
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

        console.info("Extension is enabled:", extensionIsEnabled);
        console.info("tabId:", tabId);
        console.info("browser event:", browserEvent);

        if (
          extensionIsEnabled &&
          [
            BrowserEvents.StorageOnChanged /* extension toggled on */,
            BrowserEvents.TabsOnActivated /* tab clicked */,
          ].includes(browserEvent)
        ) {
          this.cleanUp();
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
          this.cleanUp();
        }
      },
    );
  }
}
