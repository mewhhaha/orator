import { Plugin, ResolvedConfig } from "vite";
import esbuild from "esbuild";
import { Log, LogLevel, Miniflare } from "miniflare";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));

// TODO: Bundle and inline these?
const handlerModule = fs.readFileSync(`${dir}/handler.js`, "utf-8");
const wrapperModule = fs.readFileSync(`${dir}/wrapper.js`, "utf-8");

let server: { close: () => void };
let mf: Miniflare;

const routes: Record<string, string[]> = {};

const restRegex = /\[\.\.\.(.+)\]/;
const paramRegex = /\[(.+)\]/;

const stripFileSemantics = (r: string) =>
  r
    .slice("src/routes".length)
    .replace("/index.tsx", "")
    .replace("layout.tsx", "layout");

const makeIttyPath = (r: string) => {
  return stripFileSemantics(r)
    .replace(restRegex, "*")
    .replace(paramRegex, ":$1");
};

/**
 * This is passing along the param name for a [...PARAM] route which is equivalent to * in itty-router
 */
const makeRestParam = (r: string) => {
  const m = r.match(restRegex);
  if (m === null) return "";
  return `, "${m[1]}"`;
};

const buildWorker = async () => {
  const entries = Object.entries(routes)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .filter(([, fs]) => fs.length > 0);

  const method = (f: string) => f.slice(2).toLowerCase();

  const imports = entries
    .map(([key, fs], i) => {
      return `import { ${fs
        .map((f) => `${f} as ${f}${i}`)
        .join()} } from "./${key}";`;
    })
    .join("\n");

  const endpoints = entries
    .flatMap(([key, fs], i) => fs.map((f) => [key, f, i] as const))
    .map(([key, f, i]) => {
      const path = makeIttyPath(key);
      return `router.${method(
        f
      )}("${path}", wrapper(${f}${i}, "${path}"${makeRestParam(key)}));`;
    })
    .join("\n");

  const contents = (imports + "\n" + wrapperModule).replace(
    "/*! REPLACE_ME_WITH_ENDPOINTS */",
    endpoints
  );

  const worker = await esbuild.build({
    stdin: {
      contents,
      loader: "ts",
      resolveDir: process.cwd(),
    },
    plugins: [
      {
        name: "tree-shake-away-chaff",
        setup: (build) => {
          build.onLoad({ filter: /.*/ }, async ({ path }) => {
            const source = await fs.promises.readFile(path, "utf8");
            const contents = source
              .replace("process.env.NODE_ENV", '"production"')
              .replace("export default component$", "/* @__PURE__ */ ")
              .replace(/export const .* component\$/g, "/* @__PURE__ */ ");

            return {
              contents,
              loader: "default",
            };
          });
          build.onResolve({ filter: /.*/ }, ({ path }) => {
            return {
              sideEffects: false,
              external:
                path.includes("components") ||
                path.includes("@builder.io") ||
                path.includes("@qwik"),
            };
          });
        },
      },
    ],

    treeShaking: true,
    jsxSideEffects: false,
    write: false,
    jsx: "preserve",
    format: "esm",
    bundle: true,
  });

  return worker.outputFiles?.[0].text;
};

const routeFileRegex = /.*\/(src\/routes\/(.*(layout|index))\.tsx)/;

type QwikWorkerProxyPluginOptions = {
  port: number;
};

const options = {
  kvPersist: true,
  r2Persist: true,
  durableObjectsPersist: true,
  cachePersist: true,
  wranglerConfigPath: true,
  modules: true,
  log: new Log(LogLevel.INFO),
};

export const qwikWorkerProxy = ({
  port,
}: QwikWorkerProxyPluginOptions): Plugin => {
  const virtualModuleId = "virtual:proxy";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;
  let config: ResolvedConfig;

  return {
    name: "qwik-worker-proxy",
    enforce: "pre",
    buildStart: async () => {
      if (config.command !== "serve") return;
      const script = await buildWorker();
      mf = new Miniflare({
        script,
        port,
        ...options,
      });

      server = await mf.startServer();
    },
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        return handlerModule;
      }
    },
    configResolved(resolvedConfig) {
      // store the resolved config
      config = resolvedConfig;
    },
    transform: async (code, id) => {
      if (config.command !== "serve") return;
      const match = id.match(routeFileRegex);

      if (match !== null) {
        const endpoints = [
          "onPost",
          "onGet",
          "onPut",
          "onDelete",
          "onPatch",
        ].filter((f) => code.includes(f));

        routes[match[1]] = endpoints;

        const script = await buildWorker();
        await mf.setOptions({ port, script, ...options });

        if (endpoints.length === 0) return;

        const proxyImport = 'import { proxy_CF } from "virtual:proxy";\n';

        const proxied = endpoints.reduce((c, f) => {
          return replaceWithProxy(c, f, stripFileSemantics(match[1]), port);
        }, proxyImport + code);

        return { code: proxied };
      }
    },
    async closeBundle() {
      if (config.command !== "serve") return;

      if (server !== undefined) server.close();
      if (mf !== undefined) await mf.dispose();
    },
  };
};

/**
 * Super naive replacement that replaces a method with this structure for an onGet for example.
 * If it doesn't matches that format, this fails. :shrug:
 * ```tsx
 * export const onGet ....
 * ...
 * ...
 * ...
 * };
 * ```
 */
const replaceWithProxy = (
  code: string,
  f: string,
  path: string,
  port: number
) => {
  const lines = code.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`export const ${f}`));
  const end = lines.findIndex((line, i) => {
    if (i <= start) return false;
    return line === "};";
  });

  lines[start] = `export const ${f} = proxy_CF("${path}", ${port});`;

  return [...lines.slice(0, start + 1), ...lines.slice(end + 1)].join("\n");
};
