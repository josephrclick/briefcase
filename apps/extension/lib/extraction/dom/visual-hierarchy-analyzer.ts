export interface VisualScore {
  element: HTMLElement;
  fontSize: number;
  fontWeight: number;
  position: { x: number; y: number };
  visibility: number;
  zIndex: number;
  totalScore: number;
}

export interface VisualAnalysisResult {
  scores: Record<string, number>;
  positionWeights: Record<string, number>;
  visualImportance: number;
  primary: string | null;
}

export class VisualHierarchyAnalyzer {
  analyze(doc: Document): VisualAnalysisResult {
    const scores: Record<string, number> = {};
    const positionWeights: Record<string, number> = {};
    const visualScores: VisualScore[] = [];

    // Analyze all potentially important elements
    const elements = this.findVisibleElements(doc);

    for (const element of elements) {
      const visualScore = this.calculateVisualScore(element);

      if (visualScore.totalScore > 0) {
        const id = this.getOrCreateId(element);
        scores[id] = visualScore.totalScore;
        positionWeights[id] = this.calculatePositionWeight(
          visualScore.position,
        );
        visualScores.push(visualScore);
      }
    }

    // Find primary element
    let primary: string | null = null;
    let maxScore = 0;

    for (const [id, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        primary = id;
      }
    }

    // Calculate overall visual importance
    const visualImportance = this.calculateOverallImportance(visualScores);

    return {
      scores,
      positionWeights,
      visualImportance,
      primary,
    };
  }

  private findVisibleElements(doc: Document): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const allElements = doc.querySelectorAll(
      "div, section, article, main, aside, p, h1, h2, h3, h4, h5, h6",
    );

    allElements.forEach((element) => {
      if (element instanceof HTMLElement && this.isVisible(element)) {
        elements.push(element);
      }
    });

    return elements;
  }

  private isVisible(element: HTMLElement): boolean {
    // In test environment, window.getComputedStyle might not work properly
    if (typeof window === "undefined" || !window.getComputedStyle) {
      // Fallback for test environment
      const text = element.textContent?.trim() || "";
      return text.length > 0 || element.children.length > 0;
    }

    const style = window.getComputedStyle(element);

    // Check display and visibility
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    // Check dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    // Check if element has content
    const text = element.textContent?.trim() || "";
    if (text.length === 0 && element.children.length === 0) {
      return false;
    }

    return true;
  }

  private calculateVisualScore(element: HTMLElement): VisualScore {
    // Handle test environment where getComputedStyle might not work
    const style =
      typeof window !== "undefined" && window.getComputedStyle
        ? window.getComputedStyle(element)
        : element.style;
    const rect = element.getBoundingClientRect();

    // Parse font size
    const fontSize = this.parseFontSize(style.fontSize);
    const fontSizeScore = this.scoreFontSize(fontSize);

    // Parse font weight
    const fontWeight = this.parseFontWeight(style.fontWeight);
    const fontWeightScore = this.scoreFontWeight(fontWeight);

    // Calculate position score (above the fold is better)
    const position = { x: rect.left, y: rect.top };
    const positionScore = this.scorePosition(position);

    // Calculate visibility score based on opacity and z-index
    const opacity = parseFloat(style.opacity);
    const zIndex = parseInt(style.zIndex) || 0;
    const visibilityScore = opacity;

    // Calculate size score
    const area = rect.width * rect.height;
    const viewportArea = window.innerWidth * window.innerHeight;
    const sizeScore = Math.min(area / viewportArea, 1.0);

    // Check for emphasis styles
    let emphasisScore = 0;
    if (style.backgroundColor && style.backgroundColor !== "transparent") {
      emphasisScore += 0.1;
    }
    if (style.border && style.border !== "none") {
      emphasisScore += 0.05;
    }
    if (style.boxShadow && style.boxShadow !== "none") {
      emphasisScore += 0.05;
    }

    // Combine scores
    const totalScore =
      fontSizeScore * 0.25 +
      fontWeightScore * 0.15 +
      positionScore * 0.2 +
      visibilityScore * 0.1 +
      sizeScore * 0.2 +
      emphasisScore * 0.1;

    return {
      element,
      fontSize,
      fontWeight,
      position,
      visibility: opacity,
      zIndex,
      totalScore: Math.min(totalScore, 1.0),
    };
  }

  private parseFontSize(fontSize: string): number {
    const match = fontSize.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const value = parseFloat(match[1]);

      // Convert to pixels if needed
      if (fontSize.includes("em")) {
        return value * 16; // Assuming 16px base
      } else if (fontSize.includes("rem")) {
        return value * 16;
      } else if (fontSize.includes("pt")) {
        return value * 1.333;
      }

      return value;
    }
    return 16; // Default
  }

  private parseFontWeight(fontWeight: string): number {
    if (fontWeight === "normal") return 400;
    if (fontWeight === "bold") return 700;

    const weight = parseInt(fontWeight);
    return isNaN(weight) ? 400 : weight;
  }

  private scoreFontSize(size: number): number {
    // Normalize font size score (16px is baseline)
    if (size < 12) return 0.3;
    if (size < 14) return 0.5;
    if (size < 16) return 0.7;
    if (size < 20) return 0.8;
    if (size < 24) return 0.9;
    return 1.0;
  }

  private scoreFontWeight(weight: number): number {
    // Normalize font weight score
    if (weight < 400) return 0.3;
    if (weight === 400) return 0.5;
    if (weight < 600) return 0.7;
    if (weight < 700) return 0.8;
    return 1.0;
  }

  private scorePosition(position: { x: number; y: number }): number {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Score based on position (above fold and centered is better)
    let score = 1.0;

    // Vertical position (above fold is better)
    if (position.y < 0) {
      score *= 0.5; // Above viewport
    } else if (position.y < viewportHeight) {
      score *= 1.0; // In viewport
    } else if (position.y < viewportHeight * 2) {
      score *= 0.7; // Just below fold
    } else {
      score *= 0.3; // Far below fold
    }

    // Horizontal position (centered is better)
    const centerDistance = Math.abs(position.x + 200 - viewportWidth / 2);
    const centerScore =
      1.0 - Math.min(centerDistance / (viewportWidth / 2), 1.0);
    score *= 0.5 + centerScore * 0.5;

    return score;
  }

  private calculatePositionWeight(position: { x: number; y: number }): number {
    return this.scorePosition(position);
  }

  private calculateOverallImportance(visualScores: VisualScore[]): number {
    if (visualScores.length === 0) return 0;

    // Calculate average score of top elements
    const sorted = visualScores.sort((a, b) => b.totalScore - a.totalScore);
    const topElements = sorted.slice(0, Math.min(3, sorted.length));

    const avgScore =
      topElements.reduce((sum, vs) => sum + vs.totalScore, 0) /
      topElements.length;

    // Check for clear hierarchy
    let hierarchyBonus = 0;
    if (sorted.length > 1) {
      const scoreDiff = sorted[0].totalScore - sorted[1].totalScore;
      if (scoreDiff > 0.2) {
        hierarchyBonus = 0.2; // Clear primary element
      }
    }

    return Math.min(avgScore + hierarchyBonus, 1.0);
  }

  private getOrCreateId(element: HTMLElement): string {
    if (element.id) return element.id;

    const id = `visual-${Math.random().toString(36).substr(2, 9)}`;
    element.setAttribute("data-visual-id", id);
    return id;
  }
}
