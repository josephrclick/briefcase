export interface FrameworkInfo {
  framework: string | null;
  version?: string;
  confidence: number;
}

export interface WaitStrategy {
  initialWait: number;
  checkInterval: number;
  stableTime: number;
  maxWait: number;
}

export class FrameworkDetector {
  detect(doc: Document, win: Window): FrameworkInfo {
    const detectors = [
      this.detectReact.bind(this),
      this.detectVue.bind(this),
      this.detectAngular.bind(this),
      this.detectNextJs.bind(this),
      this.detectSvelte.bind(this),
      this.detectEmber.bind(this),
    ];

    for (const detector of detectors) {
      const result = detector(doc, win);
      if (result.framework && result.confidence > 0) {
        return result;
      }
    }

    return { framework: null, confidence: 0 };
  }

  private detectReact(doc: Document, win: Window): FrameworkInfo {
    let confidence = 0;
    let version: string | undefined;

    // Check for React global
    if ((win as any).React) {
      confidence += 0.4;
      version = (win as any).React.version;
    }

    // Check for React root elements
    const root = doc.getElementById("root") || doc.getElementById("app");
    if (root) {
      if ((root as any)._reactRootContainer || (root as any).__reactContainer) {
        confidence += 0.4;
      }
      if (root.hasAttribute("data-reactroot")) {
        confidence += 0.2;
      }
    }

    // Check for React DevTools
    if ((win as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      confidence += 0.2;
    }

    // Check for React fiber nodes
    const elements = doc.querySelectorAll("*");
    for (let i = 0; i < Math.min(elements.length, 10); i++) {
      const el = elements[i] as any;
      if (
        el._reactRootContainer ||
        el.__reactInternalInstance ||
        el.__reactFiber
      ) {
        confidence += 0.1;
        break;
      }
    }

    return {
      framework: confidence > 0.5 ? "react" : null,
      version,
      confidence: Math.min(confidence, 1),
    };
  }

  private detectVue(doc: Document, win: Window): FrameworkInfo {
    let confidence = 0;
    let version: string | undefined;

    // Vue 3 detection
    if ((win as any).__VUE__) {
      confidence += 0.5;
    }

    // Vue 2 detection
    if ((win as any).Vue) {
      confidence += 0.4;
      version = (win as any).Vue.version;
    }

    // Check for Vue app element
    const app = doc.getElementById("app");
    if (app && (app as any).__vue__) {
      confidence += 0.3;
    }

    // Check for Vue DevTools
    if ((win as any).__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      confidence += 0.2;
    }

    // Check for v- attributes
    if (doc.querySelector("[v-for], [v-if], [v-show], [v-model]")) {
      confidence += 0.2;
    }

    return {
      framework: confidence > 0.5 ? "vue" : null,
      version,
      confidence: Math.min(confidence, 1),
    };
  }

  private detectAngular(doc: Document, win: Window): FrameworkInfo {
    let confidence = 0;
    let version: string | undefined;

    // Check for Angular root element
    const appRoot = doc.querySelector("app-root, [ng-version]");
    if (appRoot) {
      confidence += 0.4;
      version = appRoot.getAttribute("ng-version") || undefined;
    }

    // Check for Angular attributes
    if (doc.querySelector("[_nghost-], [_ngcontent-]")) {
      confidence += 0.3;
    }

    // Check for ng global
    if ((win as any).ng) {
      confidence += 0.3;
    }

    // Check for Angular router
    if (doc.querySelector("router-outlet")) {
      confidence += 0.2;
    }

    // Check for Angular DevTools
    if ((win as any).__ANGULAR_DEVTOOLS_GLOBAL_HOOK__) {
      confidence += 0.1;
    }

    return {
      framework: confidence > 0.5 ? "angular" : null,
      version,
      confidence: Math.min(confidence, 1),
    };
  }

  private detectNextJs(doc: Document, win: Window): FrameworkInfo {
    let confidence = 0;
    let version: string | undefined;

    // Check for Next.js root element
    if (doc.getElementById("__next")) {
      confidence += 0.6;
    }

    // Check for Next.js data script
    if (doc.getElementById("__NEXT_DATA__")) {
      confidence += 0.3;
      const scriptContent = doc.getElementById("__NEXT_DATA__")?.textContent;
      if (scriptContent) {
        try {
          const data = JSON.parse(scriptContent);
          version = data.buildId;
        } catch {}
      }
    }

    // Check for Next.js runtime
    if ((win as any).__NEXT_DATA__ || (win as any).next) {
      confidence += 0.2;
    }

    return {
      framework: confidence > 0.5 ? "nextjs" : null,
      version,
      confidence: Math.min(confidence, 1),
    };
  }

  private detectSvelte(doc: Document, win: Window): FrameworkInfo {
    let confidence = 0;
    let version: string | undefined;

    // Check for Svelte class patterns
    if (doc.querySelector('[class*="svelte-"]')) {
      confidence += 0.7;
    }

    // Check for Svelte globals
    if ((win as any).__svelte) {
      confidence += 0.3;
    }

    return {
      framework: confidence > 0.5 ? "svelte" : null,
      version,
      confidence: Math.min(confidence, 1),
    };
  }

  private detectEmber(doc: Document, win: Window): FrameworkInfo {
    let confidence = 0;
    let version: string | undefined;

    // Check for Ember global
    if ((win as any).Ember) {
      confidence += 0.6;
      version = (win as any).Ember.VERSION;
    }

    // Check for Ember view attributes
    if (doc.querySelector('[id^="ember"]')) {
      confidence += 0.3;
    }

    // Check for Ember application
    if ((win as any).EmberENV || (win as any).EmberInspector) {
      confidence += 0.2;
    }

    return {
      framework: confidence > 0.5 ? "ember" : null,
      version,
      confidence: Math.min(confidence, 1),
    };
  }

  getOptimizedWaitStrategy(framework: string | null): WaitStrategy {
    const strategies: Record<string, WaitStrategy> = {
      react: {
        initialWait: 100,
        checkInterval: 50,
        stableTime: 300,
        maxWait: 2000,
      },
      vue: {
        initialWait: 100,
        checkInterval: 50,
        stableTime: 300,
        maxWait: 2000,
      },
      angular: {
        initialWait: 200,
        checkInterval: 100,
        stableTime: 500,
        maxWait: 3000,
      },
      nextjs: {
        initialWait: 150,
        checkInterval: 75,
        stableTime: 400,
        maxWait: 2500,
      },
      svelte: {
        initialWait: 100,
        checkInterval: 50,
        stableTime: 300,
        maxWait: 2000,
      },
      ember: {
        initialWait: 200,
        checkInterval: 100,
        stableTime: 400,
        maxWait: 2500,
      },
    };

    return (
      strategies[framework || ""] || {
        initialWait: 300,
        checkInterval: 100,
        stableTime: 500,
        maxWait: 3000,
      }
    );
  }
}
