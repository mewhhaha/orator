export const ws = () => {
  let self: WebSocket;
  let sessions: WebSocket[] = [];
  return {
    disconnect: (websocket: WebSocket) => {
      sessions = sessions.filter((w) => w !== websocket);
      websocket.close();
    },

    connect: ({
      onConnect,
      onMessage,
    }: {
      onConnect?: (websocket: WebSocket) => Promise<void> | void;
      onMessage?: (websocket: WebSocket, message: MessageEvent) => void;
    }) => {
      const pair = new WebSocketPair();
      const websocket = pair[1];

      websocket.accept();

      sessions.push(websocket);

      onConnect?.(pair[1]);
      self = pair[1];

      websocket.addEventListener("message", (msg) => onMessage?.(pair[1], msg));

      return new Response(null, { status: 101, webSocket: pair[0] });
    },

    broadcast: (
      message: string,
      options: { skipSelf: boolean } = { skipSelf: false }
    ) => {
      sessions = sessions.filter((session) => {
        if (options.skipSelf && session === self) {
          return true;
        }

        try {
          session.send(message);
          return true;
        } catch (_err) {
          return false;
        }
      });
    },
  };
};

export type Serialized<T> = T extends string | null | number
  ? T
  : T extends Date
  ? string
  : T extends null
  ? null
  : T extends (infer R)[]
  ? Serialized<R>[]
  : T extends Record<infer TK, unknown>
  ? {
      [Key in TK]: Serialized<T[Key]>;
    }
  : never;

export type TypedResponse<T> = Response & { __t: T };

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type HttpsStatusCode<D extends 2 | 3 | 4 | 5> =
  `${D}${Digit}${Digit}` extends `${infer N extends number}` ? N : never;

export const respond = <VALUE>(
  value: VALUE
): TypedResponse<Serialized<VALUE>> =>
  new Response(JSON.stringify(value)) as unknown as TypedResponse<
    Serialized<VALUE>
  >;

export const error = <VALUE>(
  value: any,
  status: HttpsStatusCode<3 | 4 | 5>
): TypedResponse<Serialized<VALUE>> =>
  new Response(JSON.stringify(value), { status }) as unknown as TypedResponse<
    Serialized<VALUE>
  >;

export type DurableObjectNamespaceIs<
  ClassDO extends CallableDurableObject<any>
> = DurableObjectNamespace & { __type?: ClassDO & never };

export type External<A extends Record<string, any>> = Extract<
  {
    [Key in keyof A]: A[Key] extends (
      ...args: [Request, ...any[]]
    ) => Promise<TypedResponse<any>> | TypedResponse<any>
      ? Key
      : never;
  }[Exclude<keyof A, keyof CallableDurableObject<any>>],
  string
>;

export type Client<ClassDO extends Record<string, any>> = {
  request: Request;
  stub: DurableObjectStub;
} & { __type?: ClassDO & never };

/**
 *
 * @example
 * ```tsx
 * const id = "MY_DO_ID";
 * const c = client(request, context.MY_DO, id);
 * const value = await call(c, "f");
 * ```
 */
export const client = <ClassDO extends CallableDurableObject<any>>(
  request: Request,
  ns: DurableObjectNamespaceIs<ClassDO>,
  name: string | DurableObjectId
): Client<ClassDO> => {
  const stub =
    typeof name === "string" ? ns.get(ns.idFromName(name)) : ns.get(name);
  return {
    request,
    stub,
  };
};

export type Tail<T> = T extends [any, ...infer Rest] ? Rest : never;

/**
 *
 * @example
 * ```tsx
 * const id = "MY_DO_ID";
 * const c = client(request, context.MY_DO, id);
 * const value = await call(c, "f");
 * ```
 */
export const call = async <
  ClassDO extends Record<string, any>,
  Method extends External<ClassDO>
>(
  { stub, request }: Client<ClassDO>,
  method: Method,
  ...args: Tail<Parameters<ClassDO[Method]>>
): Promise<
  Awaited<ReturnType<ClassDO[Method]>> extends TypedResponse<infer R>
    ? R
    : never
> => {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  const origin = new URL(request.url).origin;
  const response = await stub.fetch(`${origin}/${method}`, {
    body: JSON.stringify(args),
    method: "post",
    headers: headers,
  });

  return await response.json();
};

/**
 * @example
 * Functions that return values using `serialize` will be picked up as a callable interface
 *
 * ```tsx
 * class MyClass extends CallableDurableObject {
 *  f(value: string) {
 *    return serialize(value)
 *  }
 * }
 * ```
 */
export class CallableDurableObject<Env> implements DurableObject {
  constructor(protected state: DurableObjectState, protected env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const [method] = url.pathname.split("/").slice(1);
    const args = await request.json();

    // @ts-expect-error Here we go!
    return await this[method](request, ...args);
  }
}
