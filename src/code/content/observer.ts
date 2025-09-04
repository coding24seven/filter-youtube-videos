import { customEvents } from "./events";

export interface EmittedNodeEventHandler {
  (event: CustomEvent<{ node: Node }>): void;
}

export default class Observer {
  mutationObserver: MutationObserver;

  public constructor(
    private observedElement: HTMLElement,
    private eventBus: EventTarget,
  ) {
    this.mutationObserver = this.create();
  }

  public create() {
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

            this.eventBus.dispatchEvent(observerEmmittedNodeEvent);
          });
        }
      }
    });
  }

  public activate() {
    this.mutationObserver.observe(this.observedElement, {
      childList: true,
      subtree: true,
    });
    console.info("Observer started on element:", this.observedElement);
  }

  public deactivate() {
    this.mutationObserver.disconnect();
    console.info("Observer disconnected");
  }
}
