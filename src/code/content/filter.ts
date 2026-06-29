import {
  BrowserEvents,
  customEvents,
  domEvents,
  youTubeEvents,
} from './events';
import Observer, {
  EmittedNodeEventHandler,
  ObservedElementDetail,
} from './observer';
import Element from './element';
import { MessageToContentPayload, StateChanges } from '../browser-api/types';
import {
  addBrowserStorageListener,
  getTabIds,
  isActiveTab,
  isExtensionEnabled,
  updateHiddenVideoCount,
  updateVideoCount,
} from '../browser-api';
import { debounce } from '../utils';
import { selectors } from './selectors';
import YouTube from '../utils/youtube';
import Dom from './dom';
import { Filters, Options } from '../types';

export default class Filter {
  watchedFilterEnabled = true;
  membersOnlyFilterEnabled = false;
  videoNumbersAreShown = false;
  hiddenVideos = new Set();
  youTube = new YouTube();
  element = new Element();
  updateVideoCount = debounce(() => {
    void updateVideoCount(this.element.videoCount);
    void updateHiddenVideoCount(this.element.hiddenVideoCount);
  }, 100);
  numberVideos = debounce(async () => {
    if (this.videoNumbersAreShown && (await isExtensionEnabled())) {
      this.element.numberVideos();
    }
  }, 100);

  cleanUpProcedures: (() => void)[] = [];

  public constructor(filters: Filters, options: Options) {
    const { watched, membersOnly } = filters;
    const { videoNumbersAreShown } = options;
    this.watchedFilterEnabled = watched;
    this.membersOnlyFilterEnabled = membersOnly;
    this.videoNumbersAreShown = videoNumbersAreShown;

    this.addPersistentYtNavigateFinishEventListener();
    this.listenForMessageFromBackground();
    this.listenForBrowserStorageChanges();
  }

  get youTubePageType() {
    const pageType = this.youTube.getActionablePageType(window.location.href);

    if (!pageType) {
      throw new Error('YouTubePageType not found.');
    }

    return pageType;
  }

  private cleanUp() {
    this.cleanUpProcedures.forEach((procedure) => {
      procedure();
    });

    if (this.cleanUpProcedures.length) {
      console.info('Clean up done');
      this.cleanUpProcedures = [];
    } else {
      console.info('Nothing to clean up');
    }
  }

  private async run() {
    this.element.pageType = this.youTubePageType;
    console.info(`*** Running filter on ${this.element.pageType} ***`);

    const contents = await this.element.waitForAndGetAndSetContents();
    const { videoElementTagName } = this.element;
    this.addNonPersistentContentsObserver(contents, videoElementTagName);
    this.addNonPersistentChipsListener();
    this.addNonPersistentResizeEventListener();

    this.cleanUpProcedures.push(
      () => {
        console.info(
          `Cleared the Set of ${this.hiddenVideos.size} hidden video elements`,
        );
        this.hiddenVideos.clear();
      },
      () => {
        if (contents) {
          const unNumberedVideoCount = this.element.unNumberVideos();
          console.info(
            `Removed ${unNumberedVideoCount} ${selectors.videoNumberClass} elements from the DOM`,
          );
        }
      },
    );

    void this.filterLoadedVideos();
  }

  addNonPersistentContentsObserver(
    contents: HTMLElement,
    videoElementTagName: string | undefined,
  ) {
    if (!videoElementTagName) {
      throw new Error(
        `video element tag name must not be ${videoElementTagName}`,
      );
    }

    const handler: EmittedNodeEventHandler = (event) => {
      this.processNode(event.detail, videoElementTagName);
      this.updateVideoCount();
      this.numberVideos();
    };

    const eventBus = new EventTarget();
    const args: [string, EventListener] = [
      customEvents.observedElement,
      handler as EventListener,
    ];

    eventBus.addEventListener(...args);
    this.cleanUpProcedures.push(() => {
      eventBus.removeEventListener(...args);
    });

    const observer: Observer = new Observer(contents, eventBus, [
      `.${selectors.videoNumberClass}`,
    ]);
    observer.activate();
    this.cleanUpProcedures.push(() => {
      observer.deactivate();
    });
  }

  private processNode(
    detail: ObservedElementDetail,
    videoElementTagName: string,
  ) {
    const { element, action } = detail;
    const triggeringElement = element;

    switch (action) {
      case 'addedNodes':
        const videoElement = Dom.getAncestor(
          videoElementTagName,
          triggeringElement,
        );

        if (
          !videoElement ||
          this.hiddenVideos.has(videoElement) ||
          !this.shouldHideVideo(triggeringElement)
        ) {
          return;
        }

        this.hideVideo(videoElement);
        break;
      case 'removedNodes':
        const triggeringElementIsVideo = triggeringElement.matches(
          selectors.video,
        );

        if (triggeringElementIsVideo) {
          this.hiddenVideos.delete(triggeringElement);
        }
        break;
      default:
    }
  }

  /**
   * @param element - can be a video element, or an element inside a video if detected by Mutation Observer. The element and its children are checked recursively for the presence of elements that indicate the video should get hidden, based on the enabled filters
   */
  private shouldHideVideo(element: HTMLElement) {
    if (this.watchedFilterEnabled && this.element.hasProgressBar(element)) {
      return true;
    }

    return (
      this.membersOnlyFilterEnabled && this.element.hasMembersOnlyBadge(element)
    );
  }

  private hideVideo(video: HTMLElement) {
    Dom.setVisibility(video, true);
    this.hiddenVideos.add(video);
  }

  private showVideo(video: HTMLElement) {
    Dom.setVisibility(video, false);
  }

  private async filterLoadedVideos() {
    const extensionIsEnabled = await isExtensionEnabled();

    for (const video of this.element.videos) {
      if (!extensionIsEnabled) {
        this.showVideo(video);
        continue;
      }

      if (this.shouldHideVideo(video)) {
        this.hideVideo(video);
      } else {
        this.showVideo(video);
      }
    }

    this.updateVideoCount();

    if (extensionIsEnabled && this.videoNumbersAreShown) {
      this.element.numberVideos();
    }
  }

  private addNonPersistentChipsListener() {
    const handler = async (event: Event) => {
      const chipHasBeenClicked = this.element.hasChipBeenClicked(event);

      if (chipHasBeenClicked) {
        this.cleanUp();

        if (await isExtensionEnabled()) {
          void this.run();
        }
      }
    };

    const args: [string, EventListener, AddEventListenerOptions] = [
      'click',
      handler,
      { capture: true } /* bubble has event propagation stopped */,
    ];
    document.addEventListener(...args);
    this.cleanUpProcedures.push(() => {
      document.removeEventListener(...args);
    });
  }

  private get windowContentChangedHandler() {
    return async (event: Event) => {
      console.info('event type:', event.type);

      this.cleanUp(); /* must clean up as there was no tab switching (which cleans up previous tab) */

      try {
        if (await isExtensionEnabled()) {
          await this.run();
        }
      } catch (e) {
        console.info(
          'Page type missing initially means extension should not run on this page',
        );
      }
    };
  }

  /* url changed within a tab, by clicking on link or reloading page */
  /* There is no straightforward way to determine when new-page videos have fully replaced previous-page videos on SPA (non-page-reload) navigation. erroneously, YouTube dispatches this event before DOM mutations have completed, which means that at this point the contents element may contain stale video elements from previous url, and video count is usually incorrect until the DOM stops mutating, which is not predictable because long pauses may occur between mutations. Mutation Observer addresses this issue. */
  private addPersistentYtNavigateFinishEventListener() {
    window.addEventListener(
      youTubeEvents.ytNavigateFinish,
      this.windowContentChangedHandler,
    );
  }

  private addNonPersistentResizeEventListener() {
    const handler = debounce(this.windowContentChangedHandler, 1000);

    window.addEventListener(domEvents.resize, handler);

    this.cleanUpProcedures.push(() => {
      window.removeEventListener(domEvents.resize, handler);
    });
  }

  private listenForBrowserStorageChanges() {
    addBrowserStorageListener('onChanged', async (changes: StateChanges) => {
      const { extensionIsEnabled } = changes;

      if (!(extensionIsEnabled && (await isActiveTab()))) return;

      if (extensionIsEnabled.newValue) {
        void this.run();
      } else {
        await this.filterLoadedVideos();
        this.cleanUp();
      }
    });

    addBrowserStorageListener('onChanged', async (changes: StateChanges) => {
      const { filters } = changes;

      if (!(filters && (await isActiveTab()))) return;

      this.watchedFilterEnabled = filters.newValue.watched;
      this.membersOnlyFilterEnabled = filters.newValue.membersOnly;

      void this.filterLoadedVideos();
    });

    addBrowserStorageListener('onChanged', async (changes: StateChanges) => {
      const { options } = changes;

      if (!(options && (await isActiveTab()))) return;

      this.videoNumbersAreShown = options.newValue.videoNumbersAreShown;

      if (this.videoNumbersAreShown) {
        this.element.numberVideos();
      } else {
        this.element.unNumberVideos();
      }
    });
  }

  private listenForMessageFromBackground() {
    browser.runtime.onMessage.addListener(
      async (message: MessageToContentPayload, _sender, _sendResponse) => {
        const { activeTabId, browserEvent } = message;

        if (
          ![
            BrowserEvents.TabsOnActivated,
            BrowserEvents.ManagementOnInstalled,
          ].includes(browserEvent) ||
          activeTabId === undefined
        ) {
          return;
        }

        const { contentTabId } = await getTabIds();
        const isActiveTab = activeTabId === contentTabId;

        if (isActiveTab) {
          void this.run();
        }
      },
    );

    browser.runtime.onMessage.addListener(
      async (message: MessageToContentPayload, _sender, _sendResponse) => {
        const { previousTabId, browserEvent } = message;

        if (
          BrowserEvents.TabsOnActivated !== browserEvent ||
          previousTabId === undefined
        ) {
          return;
        }

        const { contentTabId } = await getTabIds();

        const isPreviousTab = previousTabId === contentTabId;

        if (isPreviousTab) {
          this.cleanUp();
        }
      },
    );
  }
}
