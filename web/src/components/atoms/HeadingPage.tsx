import { component$, Slot } from "@builder.io/qwik";

export const HeadingPage = component$(() => {
  return (
    <h1 class="sticky top-0 mb-4 h-12 px-4 py-2 text-xl font-bold backdrop-blur-md">
      <Slot />
    </h1>
  );
});
