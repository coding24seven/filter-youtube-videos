import { customEvents } from "./events";

export default class Observer {
  mutationObserver: MutationObserver;
  observerIsActive = false;

  constructor(private observedElement: HTMLElement) {
    this.mutationObserver = this.createObserver();
  }

  createObserver() {
    // Watch for new videos as they load
    return new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            const observerEmmittedNodeEvent = new CustomEvent(
              customEvents.observerEmittedNode,
              {
                detail: { node },
              },
            );

            this.observedElement.dispatchEvent(observerEmmittedNodeEvent);
          });
        }
      }
    });
  }

  activateObserver() {
    this.mutationObserver.observe(this.observedElement, {
      childList: true,
      subtree: true,
    });
    console.log("Observer started on element:", this.observedElement);
  }

  deactivateObserver() {
    if (!this.observerIsActive) {
      console.log("Observer is already inactive");
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      console.log("Observer disconnected");
      this.observerIsActive = false;
    }
  }
}
