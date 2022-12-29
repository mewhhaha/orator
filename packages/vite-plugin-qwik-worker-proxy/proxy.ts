import { action$, loader$ } from "@builder.io/qwik-city";
import { fetch as undiciFetch } from "undici";
import type { Response, Headers as UndiciHeaders } from "undici";

export const proxy_LOADER =
  (t: string, port: string): Parameters<typeof loader$>[0] =>
  async (args) => {
    const localUrl = filledRequestUrl(args.request.url, args.params, t, port);
    const localHeaders = strippedHeaders(args.request.headers);

    const response = await (fetch as unknown as typeof undiciFetch)(localUrl, {
      method: args.request.method,
      headers: localHeaders,
    });

    const redirect = response.headers.get("location");
    if (redirect) {
      throw args.redirect(Number.parseInt(await response.text()), redirect);
    }

    args.status(response.status);

    writeHeaders(args.headers, response.headers);

    return getResponseContent(response, args.headers.get("content-type"));
  };

export const proxy_ACTION =
  (t: string, port: string): Parameters<typeof action$>[0] =>
  async (form, args) => {
    const localUrl = filledRequestUrl(args.request.url, args.params, t, port);
    const localHeaders = strippedHeaders(args.request.headers);

    const f = new FormData();
    form.forEach((v, k) => {
      f.append(k, v);
    });

    const response = await (fetch as unknown as typeof undiciFetch)(localUrl, {
      method: args.method,
      headers: localHeaders,
      body: f as any,
    });

    const redirect = response.headers.get("location");
    if (redirect) {
      throw args.redirect(Number.parseInt(await response.text()), redirect);
    }

    args.status(response.status);

    writeHeaders(args.headers, response.headers);

    return getResponseContent(response, args.headers.get("content-type"));
  };

const VALID_HEADERS = new Set([
  "content-type",
  "date",
  "etag",
  "connection",
  "keep-alive",
  "set-cookie",
]);
const writeHeaders = (target: UndiciHeaders, from: UndiciHeaders) => {
  from.forEach((value, key) => {
    if (VALID_HEADERS.has(key.toLowerCase())) target.set(key, value);
  });
};

const insertParams = (path: string, params: Record<string, string>) => {
  return path
    .split("/")
    .map((segment) => {
      if (!segment.startsWith("[")) return segment;
      const name = segment.match(/\[(?:\.\.\.)?(.+)\]/);
      if (name === null) {
        throw new Error("Param not matching in handler");
      }
      return params[name[1]];
    })
    .join("/");
};

const filledRequestUrl = (
  url: string,
  params: Record<string, string>,
  t: string,
  port: string
) => {
  const { search, hash } = new URL(url);

  const path = insertParams(t, params);

  return new URL(`http://localhost:${port}${path}${search}${hash}`);
};

const strippedHeaders = (headers: UndiciHeaders) => {
  const stripped = new Headers();

  headers.forEach((v, k) => {
    stripped.append(k, v);
  });

  stripped.delete("connection");
  stripped.delete("content-length");
  stripped.delete("content-type");

  return stripped;
};

const getResponseContent = (response: Response, contentType: string | null) => {
  if (response.bodyUsed) return null;
  if (response.body === null) return null;

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  if (contentType?.includes("text")) {
    return response.text();
  }

  return response.arrayBuffer();
};
