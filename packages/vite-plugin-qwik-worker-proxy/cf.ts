import { action$, loader$ } from "@builder.io/qwik-city";
import {
  Router,
  IRequest as IttyRequest,
  RouterType,
  Route,
} from "itty-router";

interface CustomRouter extends RouterType {
  all: Route;
}

class RedirectResponse extends Error {
  public location: string;
  public status: number;
  public cookies: any;
  public headers: Headers;
  constructor(
    public url: string,
    status: number = 302,
    headers?: Headers,
    cookies?: any
  ) {
    super();
    this.location = url;
    this.status = status;
    this.headers = headers ?? new Headers();
    this.headers.set("Location", this.location);
    this.headers.delete("Cache-Control");
    this.cookies = cookies;
  }
}

// THIS IS TAKEN FROM https://github.com/kwhitley/itty-router

export const cf_ACTION =
  (f: Parameters<typeof action$>[0], path: string, rest: string) =>
  async (request: Request & IttyRequest, env: unknown, _ctx: unknown) => {
    const url = new URL(request.url);
    if (rest) {
      const segments = path.split("/").length;
      if (request.params) {
        request.params[rest] = url.pathname
          .split("/")
          .slice(segments - 1)
          .join("/");
      }
    }

    const response = {
      status: 200,
      locale: "en",
      headers: new Headers(),
    };

    const form = await request.formData();

    try {
      const body = await f(form, createContext(request, response, env));

      if (response.headers.get("content-type") === null) {
        response.headers.set("content-type", "application/json");
      }

      const init = { headers: response.headers, status: response.status };
      if (response.headers.get("content-type") === "application/json") {
        return new Response(JSON.stringify(body), init);
      } else {
        return new Response(body as BodyInit, init);
      }
    } catch (e) {
      if (e instanceof RedirectResponse) {
        return new Response(e.status.toString(), {
          headers: e.headers,
        });
      }

      return new Response(null, { status: 500 });
    }
  };

export const cf_LOADER =
  (f: Parameters<typeof loader$>[0], path: string, rest: string) =>
  async (request: Request & IttyRequest, env: unknown, _ctx: unknown) => {
    const url = new URL(request.url);
    if (rest) {
      const segments = path.split("/").length;
      if (request.params) {
        request.params[rest] = url.pathname
          .split("/")
          .slice(segments - 1)
          .join("/");
      }
    }

    const response = {
      status: 200,
      locale: "en",
      headers: new Headers(),
    };

    try {
      const body = await f(createContext(request, response, env));

      if (response.headers.get("content-type") === null) {
        response.headers.set("content-type", "application/json");
      }

      const init = { headers: response.headers, status: response.status };
      if (response.headers.get("content-type") === "application/json") {
        return new Response(JSON.stringify(body), init);
      } else {
        return new Response(body as BodyInit, init);
      }
    } catch (e) {
      if (e instanceof RedirectResponse) {
        return new Response(e.status.toString(), {
          headers: e.headers,
        });
      }

      return new Response(null, { status: 500 });
    }
  };

const createContext = (
  request: Request & IttyRequest,
  response: { status: number; locale: string; headers: Headers },
  platform: any
): Parameters<Parameters<typeof loader$>[0]>[0] => {
  const url = new URL(request.url);

  return {
    request,
    cookie: undefined as unknown as any,
    platform,
    params: request.params ?? {},
    url: new URL(request.url),
    pathname: url.pathname,
    query: url.searchParams,
    method: request.method,
    text: request.text,
    html: request.html,
    json: request.json,
    sharedMap: new Map(),
    status: (status) => {
      if (status) response.status = status;
      return response.status;
    },
    locale: (locale) => {
      if (locale) response.locale = locale;
      return response.locale;
    },
    headers: response.headers,
    redirect: (status: number | undefined = 302, url: string) => {
      return new RedirectResponse(url, status);
    },
    fail: (_status: number) => {
      throw new Error(
        "fail unimplemented, check vite-plugin-qwik-worker-proxy"
      );
    },
    error: (_status: number) => {
      throw new Error(
        "error unimplemented, check vite-plugin-qwik-worker-proxy"
      );
    },
    getData: () => {
      throw new Error(
        "error unimplemented, check vite-plugin-qwik-worker-proxy"
      );
    },
    send: (_status: number) => {
      throw new Error(
        "send unimplemented, check vite-plugin-qwik-worker-proxy"
      );
    },
    exit: () => {
      throw new Error(
        "exit unimplemented, check vite-plugin-qwik-worker-proxy"
      );
    },
  };
};

const router = <CustomRouter>Router();

/*! REPLACE_ME_WITH_ENDPOINTS */

router.all("*", (r) => new Response("Not Found.", { status: 404 }));

export default {
  fetch: router.handle,
};
