export class DOMStabilityDetector {
  private readonly STABILITY_TIMEOUT = 3000;
  private readonly DEBOUNCE_DELAY = 500;

  waitForStability(doc: Document): Promise<void> {
    return new Promise((resolve) => {
      let mutationTimer: ReturnType<typeof setTimeout> | null = null;
      let timeoutTimer: ReturnType<typeof setTimeout>;

      const observer = new MutationObserver(() => {
        if (mutationTimer) {
          clearTimeout(mutationTimer);
        }

        mutationTimer = setTimeout(() => {
          observer.disconnect();
          clearTimeout(timeoutTimer);
          resolve();
        }, this.DEBOUNCE_DELAY);
      });

      timeoutTimer = setTimeout(() => {
        observer.disconnect();
        if (mutationTimer) {
          clearTimeout(mutationTimer);
        }
        resolve();
      }, this.STABILITY_TIMEOUT);

      observer.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });

      if (this.isDocumentReady(doc)) {
        setTimeout(() => {
          observer.disconnect();
          clearTimeout(timeoutTimer);
          if (mutationTimer) {
            clearTimeout(mutationTimer);
          }
          resolve();
        }, 100);
      }
    });
  }

  private isDocumentReady(doc: Document): boolean {
    return (
      doc.readyState === "complete" &&
      doc.body &&
      doc.body.childNodes.length > 0
    );
  }
}
