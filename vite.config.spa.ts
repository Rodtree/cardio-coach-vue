/**
 * Config SOLO para el build estático (SPA) que se sirve desde el ESP32.
 * No reemplaza vite.config.ts (build normal de Lovable con SSR).
 *
 *   bun run build:spa   ->  dist-spa/  (index.html + assets, sin servidor)
 *
 * Salida 100% estática: HTML + JS + CSS. El ruteo lo hace TanStack Router
 * en el cliente, así que el ESP32 debe responder index.html para cualquier
 * path desconocido (fallback SPA). También se copia 404.html por si el
 * servidor estático usa esa convención.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { fileURLToPath } from "node:url";
import { copyFileSync, renameSync, existsSync } from "node:fs";
import path from "node:path";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const outDir = path.join(rootDir, "dist-spa");

export default defineConfig({
  base: "/",
  define: {
    __SPA_BUILD__: JSON.stringify(true),
  },
  plugins: [
    tsConfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: false,
      routesDirectory: path.join(rootDir, "src/routes"),
      generatedRouteTree: path.join(rootDir, "src/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
    {
      // index.spa.html -> index.html + 404.html (fallback SPA)
      name: "pepe-spa-html-fallback",
      closeBundle() {
        const built = path.join(outDir, "index.spa.html");
        const target = path.join(outDir, "index.html");
        if (existsSync(built)) renameSync(built, target);
        if (existsSync(target)) copyFileSync(target, path.join(outDir, "404.html"));
      },
    },
  ],
  resolve: {
    alias: { "@": path.join(rootDir, "src") },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  build: {
    outDir,
    emptyOutDir: true,
    target: "es2020",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: path.join(rootDir, "index.spa.html"),
    },
  },
});
