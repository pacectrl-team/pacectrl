import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PaceCtrlWidget",
      formats: ["umd"],
      fileName: () => "widget",
    },
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: "widget.js",
      },
    },
  },
});
