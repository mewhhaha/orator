type Authentication =
  | { status: "authenticated"; username: string }
  | { status: "not_authenticated" };

export const authenticate = (request: { headers: Headers }): Authentication => {
  const c = request.headers.get("cookie");
  return { status: "authenticated", username: c ?? "fake auth person" };
};
