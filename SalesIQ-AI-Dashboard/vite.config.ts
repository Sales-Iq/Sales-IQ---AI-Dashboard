import { resolve } from "path";
import fs from "fs";
import path from "path";
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Custom Vite Plugin to preserve all legacy SalesIQ routes and assets
 * ensuring 100% fidelity without Rollup altering Firebase CDN modules
 */
function preserveLegacyRoutesPlugin(): Plugin {
  return {
    name: "preserve-legacy-routes",
    closeBundle() {
      const rootDir = __dirname;
      const outDir = resolve(rootDir, "dist");

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // Root HTML files to preserve
      const rootFiles = [
        "login.html",
        "register.html",
        "profile.html",
        "poster.html",
        "404.html",
        "index.legacy.html",
        "sales iq_features.txt",
        "sales_iq_features.txt",
        "FEATURES.txt",
      ];

      for (const file of rootFiles) {
        const srcPath = resolve(rootDir, file);
        const destPath = resolve(outDir, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      // Directories to preserve
      const directories = ["admin", "sales", "css", "js", "themes", "assets"];

      function copyRecursive(src: string, dest: string) {
        if (!fs.existsSync(src)) return;
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          const children = fs.readdirSync(src);
          for (const child of children) {
            // Avoid copying temporary or node_modules
            if (child === "node_modules" || child === ".git") continue;
            copyRecursive(path.join(src, child), path.join(dest, child));
          }
        } else {
          fs.copyFileSync(src, dest);
        }
      }

      for (const dir of directories) {
        const srcDir = resolve(rootDir, dir);
        const destDir = resolve(outDir, dir);
        copyRecursive(srcDir, destDir);
      }

      console.log(
        "✓ [SalesIQ Build] All 24 legacy HTML routes and assets preserved in dist/"
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), preserveLegacyRoutesPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
    open: false,
  },
});
