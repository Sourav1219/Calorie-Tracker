import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  base: "/",
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts")) return "charts";
          if (id.includes("react-router")) return "router";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-hot-toast")) return "toasts";
          // Page-specific libs in their own chunks so they load only with the
          // (lazy) page that uses them, instead of bloating the vendor chunk
          // that every page — including the login screen — downloads up front.
          if (id.includes("canvas-confetti")) return "confetti"; // Dashboard only
          if (id.includes("react-easy-crop")) return "crop";     // Profile only
          return "vendor";
        },
      },
    },
  },
});
