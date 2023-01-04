import { component$ } from "@builder.io/qwik";
import { action$, Form, loader$ } from "@builder.io/qwik-city";
import { JSX } from "@builder.io/qwik/jsx-runtime";
import { call, client } from "doit";
import { HeadingPage } from "~/components/atoms/HeadingPage";
import { authenticate, HandlerParams } from "~/helpers";

export const userLoader = loader$(({ params }) => {
  return {
    avatar:
      "https://pbs.twimg.com/profile_images/1578797224368250880/Gfug3lp7_400x400.jpg",
    username: params.username,
  };
});

export const crowdLoader = loader$(
  async ({ request, params, platform }: HandlerParams) => {
    const auth = authenticate(request);
    if (auth.status === "not_authenticated") return { status: "logged_out" };
    if (auth.username === params.username) return { status: "self" };

    let follower = false;
    if (request.method === "POST") {
      const c = client(request, platform.CROWD_DO, params.username);
      follower = await call(c, "following", auth.username);
    } else {
      const cache = await platform.CROWD_KV.get(
        `followers#${params.username}#${auth.username}`
      );
      follower = cache === "true";
    }

    if (follower) return { status: "follower" };
    return { status: "not_follower" };
  }
);

export const followAction = action$(
  // @ts-ignore Types aren't aligned yet
  async (_, { request, params, platform }: HandlerParams) => {
    const auth = authenticate(request);
    if (auth.status === "not_authenticated") return null;

    const c = client(request, platform.CROWD_DO, params.username);
    await call(c, "follow", params.username, auth.username);
    return null;
  }
);

export const unfollowAction = action$(
  // @ts-ignore Types aren't aligned yet
  async (_, { request, params, platform }: HandlerParams) => {
    const auth = authenticate(request);
    if (auth.status === "not_authenticated") return null;

    const c = client(request, platform.CROWD_DO, params.username);
    await call(c, "unfollow", params.username, auth.username);
    return null;
  }
);

export default component$(() => {
  const { value: user } = userLoader.use();

  return (
    <section>
      <HeadingPage>{user.username}</HeadingPage>
      <article>
        <div class="h-48 w-full overflow-hidden bg-white">
          <img class="h-full w-full"></img>
        </div>

        <div class="relative flex items-start justify-end px-4 pt-3">
          <div class="absolute left-4 h-32 w-32 -translate-y-1/2 overflow-hidden rounded-full border-4 border-black">
            <img src={user.avatar} class="h-full w-full"></img>
          </div>

          <Toolbar />
        </div>
      </article>
    </section>
  );
});

export const Toolbar = component$(() => {
  const data = crowdLoader.use();

  return (
    <>
      {
        {
          self: <button>Edit profile</button>,
          logged_out: <ButtonFollow disabled />,
          not_follower: <ButtonFollow />,
          follower: <ButtonUnfollow />,
        }[data.value.status]
      }
    </>
  );
});

export const ButtonFollow = component$(
  (props: JSX.IntrinsicElements["button"]) => {
    const join = followAction.use();

    return (
      <Form action={join}>
        <button
          {...props}
          class={[
            "w-24 rounded-full border border-transparent bg-white px-4 py-2 font-semibold text-black hover:bg-white/90 disabled:bg-gray-700",
            props.class?.toString(),
          ]}
        >
          Follow
        </button>
      </Form>
    );
  }
);

export const ButtonUnfollow = component$(
  (props: JSX.IntrinsicElements["button"]) => {
    const leave = unfollowAction.use();
    return (
      <Form action={leave}>
        <button
          {...props}
          class={[
            "group relative w-32 rounded-full border border-gray-50 bg-black px-4 py-2 text-center font-semibold text-white hover:border-red-600",
            props.class?.toString(),
          ]}
        >
          <div class="group-hover:hidden">Following</div>
          <div class="hidden text-red-600 group-hover:block">Unfollow</div>
        </button>
      </Form>
    );
  }
);
