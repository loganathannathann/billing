import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Plain Vite config for the TanStack Start app (React + Tailwind + path aliases).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    host: true,
    strictPort: false,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      target: "cloudflare-module",
    }),
    viteReact(),
  ],
});
