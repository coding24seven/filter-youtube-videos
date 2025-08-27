import { customEvents } from "./events";

export interface EmittedNodeEventHandler {
  (event: CustomEvent<{ node: Node }>): void;
}

export default class Observer {
  mutationObserver: MutationObserver;

  constructor(private observedElement: HTMLElement) {
    this.mutationObserver = this.create();
  }

  create() {
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

  activate() {
    this.mutationObserver.observe(this.observedElement, {
      childList: true,
      subtree: true,
    });
    console.log("Observer started on element:", this.observedElement);
  }

  deactivate() {
    this.mutationObserver.disconnect();
    console.log("Observer disconnected");
  }
}
