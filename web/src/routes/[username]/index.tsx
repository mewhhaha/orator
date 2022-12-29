import { component$ } from "@builder.io/qwik";
import { loader$ } from "@builder.io/qwik-city";
import { HeadingPage } from "~/components/atoms/HeadingPage";

export const loader = loader$(({ params }) => {
  return {
    username: params.username,
  };
});

export default component$(() => {
  const data = loader.use();

  return (
    <section>
      <HeadingPage>{data.value.username}</HeadingPage>
      <article>
        <image class="h-48 w-full"></image>
      </article>
    </section>
  );
});
