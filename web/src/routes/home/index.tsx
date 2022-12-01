import { component$, Resource, Slot } from "@builder.io/qwik";
import { useEndpoint } from "@builder.io/qwik-city";
import { JSX } from "@builder.io/qwik/jsx-runtime";
import { Post } from "wtypes";
import { Form } from "~/components/atoms";
import { EndpointData, HandlerArgs } from "~/helpers";
const fakeAuthor = "me";

export const onGet = async ({ platform }: HandlerArgs) => {
  const items = await platform.TIMELINE_KV.list<Post>({
    prefix: `${fakeAuthor}#`,
  });
  const posts = items.keys
    .map((k) => k.metadata)
    .filter((p): p is Post => p !== undefined);

  return { timeline: posts, author: fakeAuthor };
};

export default component$(() => {
  const data = useEndpoint<EndpointData<typeof onGet>>();

  return (
    <Resource
      value={data}
      onResolved={({ timeline, author }) => {
        return (
          <section>
            <div class="sticky top-0 mb-4 h-12 px-4 py-2 text-xl font-bold backdrop-blur-md">
              Home
            </div>
            <Create
              author={author}
              class="border-gray border-b border-gray-700 px-8 pb-6"
            />
            <List>
              {timeline.map(({ text }) => {
                return (
                  <li class="grid grid-cols-[4rem,auto] grid-rows-2 gap-2 px-8">
                    <div>
                      <Avatar src="" />
                    </div>
                    <div>{text}</div>
                  </li>
                );
              })}
            </List>
          </section>
        );
      }}
    />
  );
});

type CreateProps = { author: string } & JSX.IntrinsicElements["div"];

export const Create = component$(({ author, ...props }: CreateProps) => {
  return (
    <div {...props}>
      <Form
        class="grid grid-cols-[4rem,auto] grid-rows-2 gap-2"
        method="post"
        action="/home/new"
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
            <button type="submit" class="rounded-full bg-blue-400 px-4 py-2">
              orate
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
