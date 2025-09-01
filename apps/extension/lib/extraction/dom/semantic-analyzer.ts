export interface SemanticScore {
  element: HTMLElement;
  score: number;
  type: string;
}

export interface SemanticAnalysisResult {
  scores: Record<string, number>;
  primaryElement: HTMLElement | null;
  landmarks: Record<string, HTMLElement>;
  confidence: number;
}

export class SemanticAnalyzer {
  private readonly semanticWeights = {
    main: 1.0,
    article: 0.95,
    section: 0.7,
    div: 0.3,
    aside: 0.2,
    nav: 0.1,
    header: 0.15,
    footer: 0.1,
  };

  private readonly ariaMainRoles = [
    "main",
    "article",
    "document",
    "application",
  ];

  private readonly ariaLandmarkRoles = [
    "banner", // header
    "navigation", // nav
    "main", // main content
    "complementary", // aside
    "contentinfo", // footer
    "search", // search
    "region", // generic region
  ];

  analyze(doc: Document): SemanticAnalysisResult {
    const scores: Record<string, number> = {};
    const landmarks: Record<string, HTMLElement> = {};
    let primaryElement: HTMLElement | null = null;
    let maxScore = 0;

    // Analyze semantic HTML5 elements
    this.analyzeSemanticElements(doc, scores);

    // Also detect landmarks from semantic HTML5 elements
    this.detectHTML5Landmarks(doc, landmarks);

    // Analyze ARIA roles
    this.analyzeAriaRoles(doc, scores, landmarks);

    // Find primary element based on scores
    // Prefer MAIN element if it exists and has good score
    const mainElements = doc.getElementsByTagName("main");
    if (mainElements.length > 0) {
      const mainElement = mainElements[0] as HTMLElement;
      const mainId = this.getOrCreateId(mainElement);
      if (scores[mainId] && scores[mainId] > 0.5) {
        primaryElement = mainElement;
        maxScore = scores[mainId];
      }
    }

    // Otherwise find highest scoring element
    if (!primaryElement) {
      for (const [id, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          const element =
            doc.getElementById(id) ||
            doc.querySelector(`[data-analyzer-id="${id}"]`);
          if (element instanceof HTMLElement) {
            primaryElement = element;
          }
        }
      }
    }

    // Calculate confidence based on semantic signals
    const confidence = this.calculateConfidence(doc, primaryElement);

    return {
      scores,
      primaryElement,
      landmarks,
      confidence,
    };
  }

  private analyzeSemanticElements(
    doc: Document,
    scores: Record<string, number>,
  ): void {
    const semanticTags = Object.keys(this.semanticWeights);

    for (const tag of semanticTags) {
      const elements = doc.getElementsByTagName(tag);

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const id = this.getOrCreateId(element);
        const baseScore =
          this.semanticWeights[tag as keyof typeof this.semanticWeights];

        // Boost score based on content length
        const textLength = element.textContent?.length || 0;
        const lengthBoost = Math.min(textLength / 1000, 1.0);

        // Boost for presence of headings
        const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
        const headingBoost = Math.min(headings.length * 0.1, 0.3);

        // Boost for paragraphs
        const paragraphs = element.querySelectorAll("p");
        const paragraphBoost = Math.min(paragraphs.length * 0.05, 0.2);

        scores[id] =
          baseScore + lengthBoost * 0.3 + headingBoost + paragraphBoost;
      }
    }
  }

  private analyzeAriaRoles(
    doc: Document,
    scores: Record<string, number>,
    landmarks: Record<string, HTMLElement>,
  ): void {
    // Find elements with ARIA roles
    const elementsWithRoles = doc.querySelectorAll("[role]");

    elementsWithRoles.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;

      const role = element.getAttribute("role");
      if (!role) return;

      const id = this.getOrCreateId(element);

      // Score main content roles
      if (this.ariaMainRoles.includes(role)) {
        const baseScore = role === "main" ? 0.9 : 0.8;
        const textLength = element.textContent?.length || 0;
        const lengthBoost = Math.min(textLength / 1000, 1.0);
        scores[id] = Math.max(scores[id] || 0, baseScore + lengthBoost * 0.2);
      }

      // Track landmark roles
      if (this.ariaLandmarkRoles.includes(role)) {
        const landmarkType = this.mapRoleToLandmark(role);
        landmarks[landmarkType] = element;
      }
    });
  }

  private mapRoleToLandmark(role: string): string {
    const roleMap: Record<string, string> = {
      banner: "header",
      navigation: "navigation",
      main: "main",
      complementary: "complementary",
      contentinfo: "footer",
      search: "search",
      region: "region",
    };

    return roleMap[role] || role;
  }

  private detectHTML5Landmarks(
    doc: Document,
    landmarks: Record<string, HTMLElement>,
  ): void {
    // Map HTML5 elements to landmark roles
    const html5Landmarks = [
      { tag: "header", landmark: "header" },
      { tag: "nav", landmark: "navigation" },
      { tag: "main", landmark: "main" },
      { tag: "aside", landmark: "complementary" },
      { tag: "footer", landmark: "footer" },
    ];

    for (const { tag, landmark } of html5Landmarks) {
      const elements = doc.getElementsByTagName(tag);
      if (elements.length > 0 && !landmarks[landmark]) {
        landmarks[landmark] = elements[0] as HTMLElement;
      }
    }
  }

  private calculateConfidence(
    doc: Document,
    primaryElement: HTMLElement | null,
  ): number {
    let confidence = 0;

    // Check for semantic HTML5
    if (doc.querySelector("main, article, section")) {
      confidence += 0.3;
    }

    // Check for ARIA roles
    if (doc.querySelector("[role='main'], [role='article']")) {
      confidence += 0.2;
    }

    // Check for structured headings
    if (doc.querySelector("h1") && doc.querySelector("h2")) {
      confidence += 0.1;
    }

    // Check if primary element was found
    if (primaryElement) {
      confidence += 0.2;

      // Boost if primary element is semantic
      const tagName = primaryElement.tagName.toLowerCase();
      if (["main", "article", "section"].includes(tagName)) {
        confidence += 0.2;
      }
    }

    return Math.min(confidence, 1.0);
  }

  private getOrCreateId(element: HTMLElement): string {
    if (element.id) return element.id;

    const id = `analyzer-${Math.random().toString(36).substr(2, 9)}`;
    element.setAttribute("data-analyzer-id", id);
    return id;
  }
}
