/**
 * Punto de entrada exclusivo del build estático (SPA) para el ESP32.
 * No se usa en el build normal de Lovable (SSR); ver vite.config.spa.ts.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "./styles.css";
import { getRouter } from "./router";

const router = getRouter();
const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
