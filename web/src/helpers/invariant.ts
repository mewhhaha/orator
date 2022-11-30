type Invariant = {
  (condition: false, format: string): asserts condition is never;
  (condition: any, format: string): asserts condition;
};

/* @__PURE__ */ export const invariant: Invariant = (
  condition: any,
  format: string
): asserts condition => {
  if (process.env.NODE_ENV === "production") return;
  if (!condition) {
    throw new Error(format);
  }
};
