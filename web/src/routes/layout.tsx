import { component$, Slot } from "@builder.io/qwik";
import { DocumentHead } from "@builder.io/qwik-city";

export const head: DocumentHead = {
  title: "Orator",
};

export default component$(() => {
  return (
    <div class="mx-auto flex h-full w-full max-w-5xl">
      <header class="w-24 flex-none border-r border-gray-700 md:w-32">
        I'm a header
      </header>
      <main class="flex-grow">
        <Slot />
      </main>
      <footer class="w-0 flex-none border-l border-gray-700 sm:w-32">
        I'm a footer
      </footer>
    </div>
  );
});
