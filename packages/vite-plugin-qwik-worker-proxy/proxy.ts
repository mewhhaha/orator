import { action$, loader$ } from "@builder.io/qwik-city";
import {
  fetch as undiciFetch,
  Headers,
  Response as UnidiciResponse,
} from "undici";

export const proxy_LOADER =
  (t: string, port: string): Parameters<typeof loader$>[0] =>
  async (args) => {
    const request = args.request;
    const { search, hash } = new URL(request.url);

    const path = insertParams(t, args.params);

    const localUrl = new URL(`http://localhost:${port}${path}${search}${hash}`);

    request.headers.delete("connection");

    const response = await (fetch as unknown as typeof undiciFetch)(localUrl, {
      method: request.method,
      headers: request.headers,
      body:
        request.headers.get("content-type") !== null
          ? await request.text()
          : undefined,
    });

    const redirect = response.headers.get("location");
    if (redirect) {
      throw args.redirect(Number.parseInt(await response.text()), redirect);
    }

    args.status(response.status);

    writeHeaders(args.headers, response.headers, [
      "content-type",
      "date",
      "etag",
      "connection",
      "keep-alive",
      "set-cookie",
    ]);

    const contentType = args.headers.get("content-type");

    const body = await readResponseBody(response);
    if (body === null) return null;

    if (contentType?.includes("application/json")) {
      return JSON.parse(body.toString());
    }

    if (contentType?.includes("text")) {
      return body.toString();
    }

    return body;
  };

const writeHeaders = (target: Headers, from: Headers, include: string[]) => {
  from.forEach((value, key) => {
    if (include.includes(key.toLowerCase())) target.set(key, value);
  });
};

const readResponseBody = async (response: UnidiciResponse) => {
  if (response.bodyUsed) return null;
  if (response.body === null) return null;
  const buffers = [];
  for await (const chunk of response.body) {
    buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(buffers);
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

export const proxy_ACTION =
  (t: string, port: string): Parameters<typeof action$>[0] =>
  async (form, args) => {
    const request = args.request;
    const { search, hash } = new URL(request.url);

    const path = insertParams(t, args.params);

    const localUrl = new URL(`http://localhost:${port}${path}${search}${hash}`);

    request.headers.delete("connection");
    request.headers.delete("content-length");
    request.headers.delete("content-type");

    const f = new FormData();
    form.forEach((v, k) => {
      f.append(k, v);
    });

    const response = await (fetch as unknown as typeof undiciFetch)(localUrl, {
      method: request.method,
      headers: request.headers,
      body: f as any,
    });

    const redirect = response.headers.get("location");
    if (redirect) {
      throw args.redirect(Number.parseInt(await response.text()), redirect);
    }

    args.status(response.status);

    writeHeaders(args.headers, response.headers, [
      "content-type",
      "date",
      "etag",
      "connection",
      "keep-alive",
      "set-cookie",
    ]);

    const contentType = args.headers.get("content-type");

    const body = await readResponseBody(response);
    if (body === null) return null;

    if (contentType?.includes("application/json")) {
      return JSON.parse(body.toString());
    }

    if (contentType?.includes("text")) {
      return body.toString();
    }

    return body;
  };
