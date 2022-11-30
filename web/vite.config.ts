import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikWorkerProxy } from "vite-plugin-qwik-worker-proxy";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  return {
    ssr: {
      target: "webworker",
      noExternal: true,
    },
    build: {
      emptyOutDir: false,
      minify: false,
    },

    plugins: [
      qwikWorkerProxy({ port: 6006 }),
      qwikCity(),
      qwikVite(),
      tsconfigPaths(),
    ],
  };
});
