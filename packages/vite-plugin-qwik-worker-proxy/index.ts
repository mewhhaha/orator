import { Plugin, ResolvedConfig } from "vite";
import esbuild from "esbuild";
import { Log, LogLevel, Miniflare } from "miniflare";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const regexLoader = /export const (\w+) = loader\$/g;
const regexAction = /export const (\w+) = action\$/g;

const dir = path.dirname(fileURLToPath(import.meta.url));

// TODO: Bundle and inline these?
const proxyModule = fs.readFileSync(`${dir}/proxy.js`, "utf-8");
const cfModule = fs.readFileSync(`${dir}/cf.js`, "utf-8");

let server: { close: () => void };
let mf: Miniflare;

const routes: Record<string, { actions: string[]; loaders: string[] }> = {};

const restRegex = /\[\.\.\.(.+)\]/;
const paramRegex = /\[(.+)\]/;

const stripFileSemantics = (r: string) =>
  r
    .slice("src/routes".length)
    .replace("index.tsx", "page")
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
  const entries = Object.entries(routes).filter(
    ([, fs]) => fs.actions.length > 0 || fs.loaders.length > 0
  );

  const imports = entries
    .map(([key, { actions, loaders }], i) => {
      const loaderImports = loaders.map((f) => `${f} as ${f}${i}`);

      const actionImports = actions.map((f) => `${f} as ${f}${i}`);

      return `import { ${[
        ...loaderImports,
        ...actionImports,
      ].join()} } from "./${key}";`;
    })
    .join("\n");

  const endpoints = entries
    .flatMap(([key, fs], i) => {
      const ls = fs.loaders.map((f) => [key, f, i, "loader"] as const);
      const as = fs.actions.map((f) => [key, f, i, "action"] as const);

      return [...ls, ...as];
    })
    .map(([key, f, i, t]) => {
      const path = makeIttyPath(key);
      const wrapper = t === "loader" ? "cf_LOADER" : "cf_ACTION";
      return `router.all("${path}/${f}", ${wrapper}(${f}${i}, "${path}"${makeRestParam(
        key
      )}));`;
    })
    .join("\n");

  const contents = (imports + "\n" + cfModule).replace(
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
              .replace(/export const .* component\$/g, "/* @__PURE__ */ ")
              .replace("loader$(", "(")
              .replace("action$(", "(");

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

  console.log(worker.outputFiles?.[0].text);
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
        return proxyModule;
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
        const loaders = [...code.matchAll(regexLoader)].map((m) => m[1]);
        const actions = [...code.matchAll(regexAction)].map((m) => m[1]);

        routes[match[1]] = {
          loaders,
          actions,
        };

        const script = await buildWorker();
        await mf.setOptions({ port, script, ...options });

        const imports = [];
        if (loaders.length > 0) imports.push("proxy_LOADER");
        if (actions.length > 0) imports.push("proxy_ACTION");

        if (imports.length === 0) return;

        const proxyImport = `import { ${imports.join()} } from "virtual:proxy";\n`;

        const as = actions.map((a) => [a, "action"] as const);
        const ls = loaders.map((l) => [l, "loader"] as const);

        const proxied = [...as, ...ls].reduce((c, [l, t]) => {
          return replaceWithProxy(
            c,
            `${stripFileSemantics(match[1])}/${l}`,
            port,
            t
          );
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
  path: string,
  port: number,
  type: "loader" | "action"
) => {
  const lines = code.split("\n");
  const start = lines.findIndex((line) =>
    line.match(type === "loader" ? regexLoader : regexAction)
  );

  const end = lines.findIndex((line, i) => {
    if (i <= start) return false;
    return line === "});" || line === ");";
  });

  const proxy = type === "loader" ? "proxy_LOADER" : "proxy_ACTION";

  lines[
    start
  ] = `export const ${type} = ${type}$(${proxy}("${path}", ${port}));`;

  return [...lines.slice(0, start + 1), ...lines.slice(end + 1)].join("\n");
};
