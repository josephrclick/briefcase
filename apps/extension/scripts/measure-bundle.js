#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Measure bundle sizes and output a performance baseline report
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, "..", "dist");
const assetsDir = path.join(distDir, "assets");

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatSize(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function measureBundles() {
  console.log("=".repeat(60));
  console.log("Bundle Size Performance Baseline");
  console.log("=".repeat(60));
  console.log();

  const bundles = {
    "Core (sidepanel)": path.join(assetsDir, "sidepanel-SjJbPddh.js"),
    "Content Script": path.join(assetsDir, "content-script.ts-LbvBSoye.js"),
    "Service Worker": path.join(assetsDir, "service-worker.ts-Crn7AxXG.js"),
    "Content Loader": path.join(
      assetsDir,
      "content-script.ts-loader-CVKbZB6d.js",
    ),
  };

  const cssFiles = fs
    .readdirSync(assetsDir)
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.join(assetsDir, f));

  let totalJsSize = 0;
  let totalCssSize = 0;

  // JavaScript bundles
  console.log("JavaScript Bundles:");
  console.log("-".repeat(40));

  Object.entries(bundles).forEach(([name, filePath]) => {
    const actualPath = fs.existsSync(filePath)
      ? filePath
      : fs
          .readdirSync(assetsDir)
          .find((f) => f.includes(path.basename(filePath).split("-")[0]));

    const resolvedPath = actualPath
      ? typeof actualPath === "string"
        ? actualPath
        : path.join(assetsDir, actualPath)
      : filePath;

    const size = getFileSize(resolvedPath);
    totalJsSize += size;
    console.log(`  ${name.padEnd(20)} ${formatSize(size).padStart(10)}`);
  });

  // CSS bundles
  console.log();
  console.log("CSS Bundles:");
  console.log("-".repeat(40));

  cssFiles.forEach((filePath) => {
    const size = getFileSize(filePath);
    totalCssSize += size;
    const name = path.basename(filePath);
    console.log(`  ${name.padEnd(20)} ${formatSize(size).padStart(10)}`);
  });

  // Summary
  const totalSize = totalJsSize + totalCssSize;

  console.log();
  console.log("=".repeat(60));
  console.log("Summary:");
  console.log("-".repeat(40));
  console.log(`  Total JavaScript:    ${formatSize(totalJsSize).padStart(10)}`);
  console.log(
    `  Total CSS:           ${formatSize(totalCssSize).padStart(10)}`,
  );
  console.log(`  Total Bundle Size:   ${formatSize(totalSize).padStart(10)}`);
  console.log();

  // Target comparison
  const target = 500 * 1024; // 500KB
  const percentage = ((totalSize / target) * 100).toFixed(1);

  console.log("Target Analysis:");
  console.log("-".repeat(40));
  console.log(`  Target Size:         ${formatSize(target).padStart(10)}`);
  console.log(`  Current Size:        ${formatSize(totalSize).padStart(10)}`);
  console.log(`  Percentage of Target: ${percentage}%`);

  if (totalSize > target) {
    const excess = totalSize - target;
    console.log(`  ⚠️  Exceeds target by: ${formatSize(excess).padStart(10)}`);
  } else {
    const remaining = target - totalSize;
    console.log(`  ✓ Under target by:   ${formatSize(remaining).padStart(10)}`);
  }

  console.log("=".repeat(60));

  // Export for CI/CD integration
  const report = {
    timestamp: new Date().toISOString(),
    bundles: Object.entries(bundles).reduce((acc, [name, filePath]) => {
      const actualPath = fs.existsSync(filePath)
        ? filePath
        : fs
            .readdirSync(assetsDir)
            .find((f) => f.includes(path.basename(filePath).split("-")[0]));
      const resolvedPath = actualPath
        ? typeof actualPath === "string"
          ? actualPath
          : path.join(assetsDir, actualPath)
        : filePath;
      acc[name] = getFileSize(resolvedPath);
      return acc;
    }, {}),
    css: cssFiles.reduce((acc, filePath) => {
      acc[path.basename(filePath)] = getFileSize(filePath);
      return acc;
    }, {}),
    totals: {
      javascript: totalJsSize,
      css: totalCssSize,
      total: totalSize,
      target,
      percentage: parseFloat(percentage),
    },
  };

  // Write JSON report
  const reportPath = path.join(__dirname, "..", "bundle-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log();
  console.log(`Report saved to: ${reportPath}`);

  return report;
}

// Run if called directly
measureBundles();

export { measureBundles };
