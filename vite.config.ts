import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dev-only: `vite` (no wrangler) has no /api/session backend, so the gateway always
 * shows "Akses ditolak". This mocks a logged-in session so `bun run dev` previews the
 * dashboard UI directly. Never runs in `vite build` output — middleware isn't bundled.
 */
function mockSessionPlugin(): Plugin {
  return {
    name: "mock-local-session",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/session", (req, res, next) => {
        if (req.method !== "GET") return next();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ staffId: "aldi", name: "Pak Aldi" }));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), mockSessionPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
