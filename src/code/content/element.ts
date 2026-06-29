import Observer, { EmittedNodeEventHandler } from './observer';
import { customEvents } from './events';
import { YouTubePageTypes } from './types';
import { selectors } from './selectors';
import Dom from './dom';

export default class Element {
  private static videoNumberTemplate: HTMLElement = (() => {
    const template = document.createElement('span');
    template.classList.add(selectors.videoNumberClass);

    return template;
  })();

  private youTubePageType: YouTubePageTypes | undefined;
  public contents: HTMLElement | null = null;

  public set pageType(value: YouTubePageTypes) {
    this.youTubePageType = value;
  }

  public get pageType() {
    if (!this.youTubePageType) {
      throw new Error('youTubePageType must be a YouTubePageType');
    }

    return this.youTubePageType;
  }

  /**
   * returns the outermost `contents` element that is visible on the page
   */
  public get newContents() {
    /* may include invisible elements */
    const contentsElements = Array.from(
      document.querySelectorAll<HTMLElement>(selectors.contents),
    );

    if (contentsElements.length === 0) {
      return null;
    }

    /* this can include #contents that are invisible and #contents for comments, on `/watch` page, for example, which must be filtered out later */
    const visibleContentsElements = contentsElements.filter((element) =>
      Dom.isVisibleOnPage(element),
    );

    /* filter out #contents elements that do not contain videos, i.e. #contents elements for viewers' comments */
    const contentsElementsWithVideos = visibleContentsElements.filter(
      (contentsElement) =>
        !!contentsElement.querySelector(this.videoElementTagName),
    );

    const [outerMostContentsElement] = contentsElementsWithVideos;

    return outerMostContentsElement;
  }

  public get videoElementTagName() {
    return selectors.video;
  }

  public get videos() {
    if (!this.contents) {
      console.info('contents element absent');

      return [];
    }

    return this.contents.querySelectorAll<HTMLElement>(
      this.videoElementTagName,
    );
  }

  public get videoCount() {
    return this.videos.length;
  }

  public get hiddenVideos() {
    return [...this.videos].filter((video) => Dom.isHidden(video));
  }

  public get hiddenVideoCount() {
    return this.hiddenVideos.length;
  }

  public get visibleVideos() {
    return [...this.videos].filter((video) => !Dom.isHidden(video));
  }

  public get _visibleVideoCount() {
    return this.visibleVideos.length;
  }

  public isVideo(element: HTMLElement) {
    return element.matches(selectors.video);
  }

  public waitForAndGetAndSetContents(): Promise<HTMLElement> {
    return new Promise((resolve) => {
      this.contents = this.newContents;

      if (this.contents) {
        console.info('#contents found, already in the DOM:', this.contents);

        resolve(this.contents);

        return;
      }

      console.info('#contents not in the DOM yet. Waiting for it to load...');

      const handler: EmittedNodeEventHandler = (_event) => {
        this.contents = this.newContents;

        if (!this.contents) {
          return;
        }

        console.info('#contents has just loaded:', this.contents);

        observer.deactivate();
        eventBus.removeEventListener(...args);

        resolve(this.contents);
      };

      const eventBus = new EventTarget();
      const args: [string, EventListener] = [
        customEvents.observedElement,
        handler as EventListener,
      ];

      eventBus.addEventListener(...args);

      const observer = new Observer(document.body, eventBus);
      observer.activate();
    });
  }

  public hasProgressBar(element: HTMLElement) {
    return !!Dom.find(element, selectors.progressBar);
  }

  public hasMembersOnlyBadge(element: HTMLElement) {
    if (this.isVideo(element)) {
      const membersOnlyElements = element.querySelectorAll(
        selectors.membersOnlyBadge,
      );

      return [...membersOnlyElements].some((element) => element.textContent);
    }

    if (element.textContent) {
      const membersOnlyElement = Dom.getAncestor(
        selectors.membersOnlyBadge,
        element,
      );

      return !!membersOnlyElement;
    }

    return false;
  }

  public hasChipBeenClicked(event: Event) {
    const ancestorNodes = event.composedPath() as (EventTarget | Element)[];

    return ancestorNodes.some(
      (node) =>
        'matches' in node &&
        typeof node.matches === 'function' &&
        node.matches(selectors.chips),
    );
  }

  private removeNumberFromVideo(video: HTMLElement) {
    video.classList.remove(selectors.numberedVideoClass);

    const numberElementToRemove = video.querySelector(
      `.${selectors.videoNumberClass}`,
    );

    if (numberElementToRemove) {
      numberElementToRemove.remove();
      return true;
    } else {
      return false;
    }
  }

  private appendNumberToVideo(video: HTMLElement, no: number) {
    const numberElement = Element.videoNumberTemplate.cloneNode(
      true,
    ) as HTMLElement;
    numberElement.textContent = String(no);
    video.classList.add(selectors.numberedVideoClass);
    video.appendChild(numberElement);
  }

  /* element with class `video-number` is excluded from event dispatch in mutation observer */
  public numberVideos() {
    this.visibleVideos.forEach((video, i) => {
      this.removeNumberFromVideo(video);
      this.appendNumberToVideo(video, i + 1);
    });
  }

  public unNumberVideos() {
    let removedNumberElementCount = 0;

    this.visibleVideos.forEach((video) => {
      if (this.removeNumberFromVideo(video)) {
        removedNumberElementCount++;
      }
    });

    return removedNumberElementCount;
  }
}
