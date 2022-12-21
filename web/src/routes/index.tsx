import { component$ } from "@builder.io/qwik";
import { loader$ } from "@builder.io/qwik-city";

export const loader = loader$(({ redirect }) => {
  throw redirect(302, "/home");
});

export default component$(() => {
  loader.use();
  return <></>;
});
