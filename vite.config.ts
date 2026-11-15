import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// One dev server: React front end + the Hono worker (worker/index.ts) running in workerd.
// Remote bindings (Workers AI) are off locally: this network blocks the remote proxy, and the
// alarm falls back to the browser voice when /api/say fails. The real voice runs when deployed.
export default defineConfig({
  plugins: [react(), cloudflare({ remoteBindings: false })],
});
