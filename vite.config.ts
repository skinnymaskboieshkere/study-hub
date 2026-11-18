import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT || 5180);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src/client"),
        "@shared": path.resolve(import.meta.dirname, "src/shared"),
      },
    },
    server: {
      // Only this computer can open the app (see BRIEF).
      host: "127.0.0.1",
      port,
      strictPort: true,
      // In dev the API runs on the next port; the browser only talks to Vite.
      proxy: { "/api": `http://127.0.0.1:${port + 1}` },
    },
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
    },
  };
});
