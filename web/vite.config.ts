import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikWorkerProxy } from "vite-plugin-qwik-worker-proxy";
import tsconfigPaths from "vite-tsconfig-paths";
import { WritableStream } from "web-streams-polyfill/ponyfill";

// @ts-ignore This doesn't exist for some reason
global.WritableStream = WritableStream;

export default defineConfig(() => {
  return {
    plugins: [
      qwikWorkerProxy({ port: 6006 }),
      qwikCity(),
      qwikVite(),
      tsconfigPaths(),
    ],
    preview: {
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
  };
});
