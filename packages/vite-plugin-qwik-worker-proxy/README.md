Don't use this if you expect any stability. It's a super hacky way of running each exported function in the routes directory in a worker environment. For very simple things it works.

IMPORTANT:

Need `NODE_OPTIONS=--experimental-vm-modules` before the vite dev command

Use it like

```tsx
import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import { qwikWorkerProxy } from "vite-plugin-qwik-worker-proxy";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  return {
    plugins: [
      qwikWorkerProxy({ port: 6006 }), // HERE
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
```
