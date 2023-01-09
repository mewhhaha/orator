import { component$ } from "@builder.io/qwik";
import { action$, Form, loader$ } from "@builder.io/qwik-city";
import { JSX } from "@builder.io/qwik/jsx-runtime";
import { client, call } from "doit";
import { Post } from "wtypes";
import { Avatar } from "~/components/atoms/Avatar";
import { HeadingPage } from "~/components/atoms/HeadingPage";
import { authenticate, HandlerParams } from "~/helpers";

export default component$(() => {
  const data = loader.use();

  return (
    <section>
      <HeadingPage>Home</HeadingPage>
      {data.value.user && (
        <Create
          profileImage={data.value.user?.profileImage}
          class="border-gray border-b border-gray-700 px-4 pb-6"
        />
      )}
      <ul class="py-4">
        {data.value.feed.map(({ text, profileImage }) => {
          return (
            <li class="grid grid-cols-[4rem,auto] grid-rows-[1fr,2rem] gap-2 px-4">
              <div>
                <Avatar src={profileImage} />
              </div>
              <div>{text}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

type CreateProps = { profileImage: string } & JSX.IntrinsicElements["div"];

export const Create = component$(({ profileImage, ...props }: CreateProps) => {
  const createPost = action.use();

  return (
    <div {...props}>
      <Form
        class="grid grid-cols-[3rem,auto] grid-rows-[1fr,3rem] gap-2"
        action={createPost}
      >
        <div>
          <Avatar src={profileImage} />
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

export const loader = loader$(async ({ request, platform }: HandlerParams) => {
  const auth = await authenticate(platform, request);
  if (auth.status === "unauthenticated") {
    return { feed: [], user: undefined };
  }

  const userDO = client(request, platform.USER_DO, auth.payload.sub);

  const user = await call(userDO, "details");

  const items = await platform.FEED_KV.list<Post>({
    prefix: `${user.userName}#`,
  });

  const posts = items.keys
    .map((k) => k.metadata)
    .filter((p): p is Post => p !== undefined);

  return { feed: posts, user };
});

export const action = action$(
  // @ts-ignore Types aren't good for action$ yet
  async (form, { request, platform, error }: HandlerParams) => {
    const auth = await authenticate(platform, request);
    if (auth.status === "unauthenticated") {
      throw error(403, "Not authenticated");
    }

    const text = form.get("text")?.toString();
    if (!text) {
      throw error(422, "Missing text");
    }

    const id = platform.POST_DO.newUniqueId();
    const userDO = client(request, platform.USER_DO, auth.payload.sub);

    try {
      const user = await call(userDO, "details");

      const postDO = client(request, platform.POST_DO, id);
      const crowdDO = client(request, platform.CROWD_DO, user.userName);
      const timelineDO = client(request, platform.TIMELINE_DO, user.userName);

      const post = await call(postDO, "write", user, text);
      call(crowdDO, "deliver", post);

      await call(timelineDO, "add", post);

      return post;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
);
