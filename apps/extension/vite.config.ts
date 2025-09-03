import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest }),
    visualizer({
      filename: "dist/bundle-stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap", // or "sunburst", "network", "raw-data", "list"
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: "sidepanel/index.html",
      },
    },
  },
});
