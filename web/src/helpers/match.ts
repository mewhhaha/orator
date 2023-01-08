export const match = <KEY extends string | number, RETURN>(
  key: `${string}` extends `${KEY}`
    ? never
    : `${number}` extends `${KEY}`
    ? never
    : KEY,
  cases: { [K in KEY]: (value: K) => RETURN }
): RETURN => {
  const f = cases[key];
  return f?.(key);
};
