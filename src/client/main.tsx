import "@fontsource-variable/inter";
import "@fontsource-variable/unbounded";
import "@/styles/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "@/app/router";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Element #root is missing in index.html");

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
