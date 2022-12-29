import { component$, Slot } from "@builder.io/qwik";
import { action$, Form, loader$ } from "@builder.io/qwik-city";
import { JSX } from "@builder.io/qwik/jsx-runtime";
import { client, call } from "doit";
import { Post } from "wtypes";
import { HeadingPage } from "~/components/atoms/HeadingPage";
import { HandlerParams } from "~/helpers";

export const loader = loader$(async ({ platform }: HandlerParams) => {
  const fakeAuthor =
    "https://pbs.twimg.com/profile_images/1578797224368250880/Gfug3lp7_400x400.jpg";

  const items = await platform.TIMELINE_KV.list<Post>({
    prefix: `${fakeAuthor}#`,
  });
  const posts = items.keys
    .map((k) => k.metadata)
    .filter((p): p is Post => p !== undefined);

  return { timeline: posts, author: fakeAuthor };
});

export const action = action$(
  // @ts-ignore Types aren't good for action$ yet
  async (form, { request, platform, error }: HandlerParams) => {
    const fakeAuthor =
      "https://pbs.twimg.com/profile_images/1578797224368250880/Gfug3lp7_400x400.jpg";

    const text = form.get("text")?.toString();
    if (!text) {
      throw error(422, "Missing text");
    }

    const id = platform.POST_DO.newUniqueId();
    const postDO = client(request, platform.POST_DO, id);
    const crowdDO = client(request, platform.CROWD_DO, fakeAuthor);
    const timelineDO = client(request, platform.TIMELINE_DO, fakeAuthor);
    const post = await call(postDO, "write", fakeAuthor, text);
    await Promise.all([
      call(crowdDO, "deliver", post),
      call(timelineDO, "add", post),
    ]);

    return post;
  }
);

export default component$(() => {
  const q = loader.use();

  return (
    <section>
      <HeadingPage>Home</HeadingPage>
      <Create
        author={q.value.author}
        class="border-gray border-b border-gray-700 px-4 pb-6"
      />
      <List class="py-4">
        {q.value.timeline.map(({ text, author }) => {
          return (
            <li class="grid grid-cols-[4rem,auto] grid-rows-[1fr,2rem] gap-2 px-4">
              <div>
                <Avatar src={author} />
              </div>
              <div>{text}</div>
            </li>
          );
        })}
      </List>
    </section>
  );
});

type CreateProps = { author: string } & JSX.IntrinsicElements["div"];

export const Create = component$(({ author, ...props }: CreateProps) => {
  const createPost = action.use();

  return (
    <div {...props}>
      <Form
        class="grid grid-cols-[3rem,auto] grid-rows-[1fr,3rem] gap-2"
        action={createPost}
      >
        <div>
          <Avatar src={author} />
        </div>
        <div>
          <textarea
            name="text"
            placeholder="What's happening?"
            class="w-full rounded-sm bg-transparent py-2 px-4 text-xl placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div class="col-start-2 flex items-start justify-between pl-4">
          <div>attachments</div>
          <div>
            <button
              type="submit"
              class="rounded-full bg-sky-500 px-4 py-2 font-medium"
            >
              Orate
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
});

type ListProps = JSX.IntrinsicElements["ul"];

export const List = component$((props: ListProps) => {
  return (
    <ul {...props}>
      <Slot />
    </ul>
  );
});

type ItemProps = JSX.IntrinsicElements["li"];

export const Item = component$((props: ItemProps) => {
  return <li {...props}></li>;
});

type AvatarProps = {
  src: string;
};

export const Avatar = component$(({ src }: AvatarProps) => {
  return (
    <div class="h-12 w-12 overflow-hidden rounded-full bg-white">
      <image src={src} class="h-full w-full" />
    </div>
  );
});
