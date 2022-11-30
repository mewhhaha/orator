import { RequestHandler } from "@builder.io/qwik-city";
import nodeFetch, { Response } from "node-fetch";

export const proxy_CF =
  (t: string, port: string): RequestHandler =>
  async (args) => {
    const request = args.request;
    const { search, hash } = new URL(request.url);

    const path = insertParams(t, args.params);

    const localUrl = new URL(`http://localhost:${port}${path}${search}${hash}`);

    const response = await (fetch as typeof nodeFetch)(localUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body:
        request.headers.get("content-type") !== null
          ? await request.text()
          : undefined,
    });

    const redirect = response.headers.get("location");
    if (redirect) {
      throw args.response.redirect(
        redirect,
        Number.parseInt(await response.text())
      );
    }

    args.response.status = response.status;

    writeHeaders(args.response.headers, response.headers, [
      "content-type",
      "date",
      "etag",
      "connection",
      "keep-alive",
      "set-cookie",
    ]);

    const contentType = args.response.headers.get("content-type");

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

const readResponseBody = async (response: Response) => {
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
