import { Cookie, RequestHandler, ResponseContext } from "@builder.io/qwik-city";
import { Router, Request as IttyRequest } from "itty-router";

class RedirectResponse extends Error {
  public location: string;
  public status: number;
  public cookies: any;
  public headers: Headers;
  constructor(
    public url: string,
    status: number = 302,
    headers?: Headers,
    cookies?: Cookie
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

export const wrapper =
  (f: RequestHandler, path: string, rest: string) =>
  async (request: Request & IttyRequest, env: unknown, _ctx: unknown) => {
    if (rest) {
      const url = new URL(request.url);
      const segments = path.split("/").length;
      if (request.params) {
        request.params[rest] = url.pathname
          .split("/")
          .slice(segments - 1)
          .join("/");
      }
    }

    const response: ResponseContext = {
      status: 200,
      locale: "en",
      headers: new Headers(),
      redirect: (url: string, status: number | undefined = 302) => {
        return new RedirectResponse(url, status);
      },
      error: (_status: number) => {
        throw new Error(
          "error unimplemented, check vite-plugin-qwik-worker-proxy"
        );
      },
    };

    try {
      const body = await f({
        request,
        response,
        cookie: undefined as unknown as Cookie,
        platform: env,
        params: request.params ?? {},
        url: new URL(request.url),
        next: () => {
          throw new Error(
            "next unimplemented, check vite-plugin-qwik-worker-proxy"
          );
        },
        abort: () => {
          throw new Error(
            "abort unimplemented, check vite-plugin-qwik-worker-proxy"
          );
        },
      });

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

const router = Router();

/*! REPLACE_ME_WITH_ENDPOINTS */

router.all("*", () => new Response("Not Found.", { status: 404 }));

export default {
  fetch: router.handle,
};
