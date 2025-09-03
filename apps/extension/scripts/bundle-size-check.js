#!/usr/bin/env node

/**
 * Bundle Size Regression Prevention
 *
 * Checks bundle size against baseline and warns if thresholds are exceeded.
 * This is a soft check - warns but doesn't fail the build.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Baseline metrics from Phase 1
const BASELINE_METRICS = {
  mainBundle: 61800, // 61.8 KB
  totalSize: 500000, // 500 KB target
  criticalBundles: {
    sidepanel: 45000, // ~45 KB
    "content-script": 44000, // ~44 KB
    "service-worker": 2000, // ~2 KB
  },
};

// Warning thresholds (percentage increase from baseline)
const WARNING_THRESHOLD = 0.1; // 10% increase triggers warning
const DANGER_THRESHOLD = 0.25; // 25% increase triggers danger warning

function formatBytes(bytes) {
  return (bytes / 1024).toFixed(2) + " KB";
}

function checkBundleSize() {
  const distPath = path.join(__dirname, "..", "dist", "assets");

  if (!fs.existsSync(distPath)) {
    console.log("⚠️  No dist folder found. Please run build first.");
    return;
  }

  const files = fs.readdirSync(distPath);
  let totalSize = 0;
  const bundles = {};

  // Analyze bundle sizes
  files.forEach((file) => {
    if (file.endsWith(".js")) {
      const stats = fs.statSync(path.join(distPath, file));
      const size = stats.size;
      totalSize += size;

      // Categorize bundles
      if (file.includes("sidepanel")) {
        bundles.sidepanel = (bundles.sidepanel || 0) + size;
      } else if (file.includes("content-script")) {
        bundles["content-script"] = (bundles["content-script"] || 0) + size;
      } else if (file.includes("service-worker")) {
        bundles["service-worker"] = (bundles["service-worker"] || 0) + size;
      }
    }
  });

  console.log("\n📊 Bundle Size Report\n");
  console.log("─".repeat(50));

  // Check total size
  const totalIncrease =
    (totalSize - BASELINE_METRICS.totalSize) / BASELINE_METRICS.totalSize;
  const totalStatus = getStatus(totalIncrease);

  console.log(`Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`Baseline: ${formatBytes(BASELINE_METRICS.totalSize)}`);
  console.log(
    `Change: ${(totalIncrease * 100).toFixed(1)}% ${totalStatus.emoji}`,
  );

  if (totalStatus.level !== "success") {
    console.log(`${totalStatus.emoji} ${totalStatus.message}`);
  }

  console.log("\n📦 Bundle Breakdown:\n");

  // Check individual bundles
  Object.entries(bundles).forEach(([name, size]) => {
    const baseline = BASELINE_METRICS.criticalBundles[name];
    if (baseline) {
      const increase = (size - baseline) / baseline;
      const status = getStatus(increase);

      console.log(
        `${name}: ${formatBytes(size)} (baseline: ${formatBytes(baseline)})`,
      );

      if (status.level !== "success") {
        console.log(
          `  ${status.emoji} ${(increase * 100).toFixed(1)}% increase`,
        );
      }
    }
  });

  console.log("\n─".repeat(50));

  // Recommendations
  if (totalIncrease > WARNING_THRESHOLD) {
    console.log("\n💡 Recommendations:");
    console.log("- Review recent dependency additions");
    console.log("- Check for unnecessary imports");
    console.log("- Consider lazy loading for new features");
    console.log("- Run `npm run analyze:visualize` for detailed analysis");
  }

  // Save current metrics for tracking
  const metricsFile = path.join(__dirname, "..", "bundle-metrics.json");
  const metrics = {
    timestamp: new Date().toISOString(),
    totalSize,
    bundles,
    baseline: BASELINE_METRICS,
    increase: totalIncrease,
  };

  fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
  console.log(`\n📝 Metrics saved to bundle-metrics.json`);
}

function getStatus(increase) {
  if (increase <= 0) {
    return { level: "success", emoji: "✅", message: "Size reduced!" };
  } else if (increase < WARNING_THRESHOLD) {
    return {
      level: "success",
      emoji: "✅",
      message: "Within acceptable range",
    };
  } else if (increase < DANGER_THRESHOLD) {
    return {
      level: "warning",
      emoji: "⚠️",
      message: "Bundle size increased - consider optimization",
    };
  } else {
    return {
      level: "danger",
      emoji: "⛔",
      message: "Significant size increase - review changes",
    };
  }
}

// Run the check
checkBundleSize();
