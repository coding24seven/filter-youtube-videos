import { BrowserEvents, customEvents, youTubeEvents } from "./events";
import Observer, { EmittedNodeEventHandler } from "./observer";
import { YouTubePageTypes } from "./types";
import {
  getMembersOnlyBadgeElement,
  getProgressBarElementByPageType,
  waitForAndGetContentsElement,
} from "./elements";
import { MessagePayload } from "../browser-api/types";
import { getCurrentYouTubePageType } from "../utils";
import { isExtensionEnabled } from "../browser-api";

export interface FiltersState {
  watchedFilterEnabled: boolean;
  membersOnlyFilterEnabled: boolean;
}

export default class Filter {
  currentYouTubePageType: YouTubePageTypes | null = null;
  watchedFilterEnabled: boolean = true;
  membersOnlyFilterEnabled: boolean = true;
  videosHiddenCount = 0;
  cleanUpProcedures: (() => void)[] = [];

  constructor(public filtersState: FiltersState) {
    this.setUpYtNavigateFinishEventListener();
    this.establishCommunicationWithBackground();
  }

  cleanUp() {
    console.log("Cleaning up");
    this.cleanUpProcedures.forEach((procedure) => {
      procedure();
    });

    this.videosHiddenCount = 0;
    this.currentYouTubePageType = null;
  }

  async run() {
    console.log("*** Running filter ***");
    const [contentsElement, cleanUpProcedure]: [HTMLElement, () => void] =
      await waitForAndGetContentsElement();
    this.cleanUpProcedures.push(cleanUpProcedure);

    const { watchedFilterEnabled, membersOnlyFilterEnabled } =
      this.filtersState;

    this.watchedFilterEnabled = watchedFilterEnabled;
    this.membersOnlyFilterEnabled = membersOnlyFilterEnabled;

    this.filterAllLoadedVideos(true).catch((err: Error) => {
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
      console.log(
        "before processNode, videoElementTagName",
        videoElementTagName,
      );
      this.processNode(event.detail.node, videoElementTagName);
    };

    const eventBus = new EventTarget();

    const args: [string, EventListener] = [
      customEvents.observerEmittedNode,
      handler as EventListener,
    ];

    eventBus.addEventListener(...args);
    this.cleanUpProcedures.push(() => {
      eventBus.removeEventListener(...args);
    });

    const observer = new Observer(contentsElement, eventBus);
    observer.activate();
    this.cleanUpProcedures.push(() => {
      observer.deactivate();
    });
  }

  processNode(node: Node, videoElementTagName: string) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    // todo: debounce this as once a video element is located, it makes no sense to react to new nodes added inside of it
    const triggeringElement = node as HTMLElement;

    const videoElement = triggeringElement.closest(
      videoElementTagName,
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
    const [contentsElement, cleanUpProcedure]: [HTMLElement, () => void] =
      await waitForAndGetContentsElement();
    this.cleanUpProcedures.push(cleanUpProcedure);

    if (!contentsElement) return;

    const videoElements = contentsElement.children;

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

  /* url changed within a tab, by clicking on link or reloading page */
  setUpYtNavigateFinishEventListener() {
    const handler = async (event: Event) => {
      console.log(youTubeEvents.ytNavigateFinish, "event:", event);

      if (!(await isExtensionEnabled())) {
        return;
      }

      this.cleanUp();
      this.currentYouTubePageType = getCurrentYouTubePageType(
        window.location.href,
      );
      void this.run();
    };

    window.addEventListener(youTubeEvents.ytNavigateFinish, handler);
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
        console.log("tabId:", tabId);
        console.log("browser event:", browserEvent);

        if (
          extensionIsEnabled &&
          [
            BrowserEvents.StorageOnChanged /* extension toggled on */,
            BrowserEvents.TabsOnActivated /* tab clicked */,
          ].includes(browserEvent)
        ) {
          this.cleanUp();
          this.currentYouTubePageType = currentYouTubePageType;
          void this.run();

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
          this.restoreVideosVisibility();
          this.cleanUp();
        }
      },
    );
  }
}
