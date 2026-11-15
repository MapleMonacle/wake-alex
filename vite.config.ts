import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// One dev server: React front end + the Hono worker (worker/index.ts) running in workerd.
export default defineConfig({
  plugins: [react(), cloudflare()],
});
