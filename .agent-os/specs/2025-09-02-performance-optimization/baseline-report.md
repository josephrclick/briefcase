# Performance Baseline Report

> Generated: 2025-09-02
> Bundle Measurement Tool: `npm run analyze:bundle`

## Current Bundle Size Analysis

### JavaScript Bundles

- **Core (sidepanel)**: 153.3 KB
- **Content Script**: 42.3 KB
- **Service Worker**: 1.4 KB
- **Content Loader**: 0.3 KB
- **Total JavaScript**: 197.3 KB

### CSS Bundles

- **Sidepanel CSS**: 17.8 KB
- **Total CSS**: 17.8 KB

### Summary

- **Total Bundle Size**: 215.0 KB
- **Target Size**: 500.0 KB
- **Current Usage**: 43.0% of target
- **Status**: ✅ Under target by 285.0 KB

## Bundle Composition Breakdown

### Core Dependencies (estimated from bundle analysis)

- **Preact + Compat**: ~40KB
- **OpenAI SDK**: ~60KB
- **Readability**: ~30KB
- **Radix UI**: ~20KB
- **Application Code**: ~65KB

## Performance Characteristics

### Current Architecture

- All code loaded synchronously on extension initialization
- No code splitting or lazy loading implemented
- Site-specific extractors bundled even when unused
- Manual selection UI always included despite rare usage

### Optimization Opportunities

1. **Lazy Load Manual Selection UI**: ~50-100KB potential reduction
2. **Dynamic Site Extractors**: ~30-50KB per extractor
3. **OpenAI SDK Lazy Loading**: ~60KB deferred until needed
4. **Code Splitting**: Better initial load performance

## Measurement Tools

### Bundle Analysis Script

- Location: `apps/extension/scripts/measure-bundle.js`
- Command: `npm run analyze:bundle`
- Output: Console report + `bundle-report.json`

### Features

- Automatic bundle size calculation
- Target comparison (500KB)
- JSON export for CI/CD integration
- Breakdown by module type

## Next Steps

With the baseline established at 215KB (43% of target), we have significant headroom for optimization while maintaining all functionality. The focus should be on:

1. Implementing lazy loading for rarely-used features
2. Creating clear module boundaries
3. Setting up monitoring to prevent future bloat

The current bundle is already well under target, allowing us to prioritize code organization and maintainability over aggressive size reduction.
