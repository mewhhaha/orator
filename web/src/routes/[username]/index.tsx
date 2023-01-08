import { component$ } from "@builder.io/qwik";
import { action$, Form, loader$ } from "@builder.io/qwik-city";
import { JSX } from "@builder.io/qwik/jsx-runtime";
import { call, client, Serialized } from "doit";
import { UserDetails } from "peeper-user";
import { Post } from "wtypes";
import { Avatar } from "~/components/atoms/Avatar";
import { HeadingPage } from "~/components/atoms/HeadingPage";
import { authenticate, HandlerParams } from "~/helpers";
import { match } from "~/helpers/match";

export default component$(() => {
  const data = userLoader.use();

  return (
    <section>
      <HeadingPage>{data.value?.userName}</HeadingPage>
      <article>
        <div class="h-48 w-full overflow-hidden bg-white">
          <img class="h-full w-full"></img>
        </div>

        <div class="relative mb-8 flex items-start justify-end px-4 pt-3">
          <div class="absolute left-4 h-32 w-32 -translate-y-1/2 overflow-hidden rounded-full border-4 border-black">
            <img src={data.value?.profileImage} class="h-full w-full"></img>
          </div>

          <Toolbar />
        </div>

        <div class="px-2">
          <h2 class="text-lg font-bold leading-4">{data.value?.displayName}</h2>
          <p class="mb-4 text-sm text-gray-500">@{data.value?.userName}</p>

          <p>{data.value?.description}</p>
        </div>
      </article>
      <List />
    </section>
  );
});

export const List = component$(() => {
  const data = timelineLoader.use();
  return (
    <ul class="py-4">
      {data.value.map(({ text, profileImage }) => {
        return (
          <li class="grid grid-cols-[4rem,auto] grid-rows-[1fr,2rem] gap-2 border-b border-gray-700 px-4 py-2 transition-colors hover:bg-white/5">
            <div>
              <Avatar src={profileImage} />
            </div>
            <div>{text}</div>
          </li>
        );
      })}
    </ul>
  );
});

export const Toolbar = component$(() => {
  const data = crowdLoader.use();

  return (
    <>
      {match(data.value.status, {
        [CrowdStatus.Self]: () => <ButtonEditProfile />,
        [CrowdStatus.LoggedOut]: () => <ButtonFollow disabled />,
        [CrowdStatus.NotFollower]: () => <ButtonFollow />,
        [CrowdStatus.Follower]: () => <ButtonUnfollow />,
      })}
    </>
  );
});

export const ButtonEditProfile = component$(
  (props: JSX.IntrinsicElements["button"]) => {
    return (
      <button
        {...props}
        class={[
          "relative w-32 rounded-full border border-gray-500 bg-black px-2 py-1 text-center font-semibold text-white ",
          props.class?.toString(),
        ]}
      >
        Edit Profile
      </button>
    );
  }
);

export const ButtonFollow = component$(
  (props: JSX.IntrinsicElements["button"]) => {
    const join = followAction.use();

    return (
      <Form action={join}>
        <button
          {...props}
          class={[
            "w-24 rounded-full border border-transparent bg-white px-2 py-1 font-semibold text-black hover:bg-white/90 disabled:bg-gray-700",
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
            "group relative w-32 rounded-full border border-gray-500 bg-black px-2 py-1 text-center font-semibold text-white hover:border-red-600",
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

export const userLoader = loader$(({ params, platform }: HandlerParams) => {
  const user = platform.USER_KV.get<Serialized<UserDetails>>(
    params.username,
    "json"
  );
  return user;
});

export const timelineLoader = loader$(
  async ({ params, platform }: HandlerParams) => {
    const timeline = await platform.TIMELINE_KV.list<Serialized<Post>>({
      prefix: params.username,
    });
    return timeline.keys
      .map((v) => v.metadata)
      .filter((v): v is Serialized<Post> => !!v);
  }
);

export enum CrowdStatus {
  Self,
  LoggedOut,
  Follower,
  NotFollower,
}

export const crowdLoader = loader$(
  async ({ request, params, platform }: HandlerParams) => {
    const auth = await authenticate(platform, request);
    if (auth.status === "unauthenticated") {
      return { status: CrowdStatus.LoggedOut };
    }

    const crowdDO = client(request, platform.CROWD_DO, params.username);
    const userDO = client(request, platform.USER_DO, auth.payload.sub);

    const user = await call(userDO, "details");
    if (user.userName === params.username) return { status: CrowdStatus.Self };

    const isFollower = async () => {
      if (request.method === "POST") {
        return await call(crowdDO, "following", user.userName);
      } else {
        const cache = await platform.CROWD_KV.get(
          `followers#${params.username}#${user.userName}`
        );
        return cache === "true";
      }
    };

    if (await isFollower()) return { status: CrowdStatus.Follower };
    return { status: CrowdStatus.NotFollower };
  }
);

export const followAction = action$(
  // @ts-ignore Types aren't aligned yet
  async (_, { request, params, platform }: HandlerParams) => {
    const auth = await authenticate(platform, request);
    if (auth.status === "unauthenticated") return null;

    const crowdDO = client(request, platform.CROWD_DO, params.username);
    const userDO = client(request, platform.USER_DO, auth.payload.sub);

    const user = await call(userDO, "details");

    await call(crowdDO, "follow", params.username, user.userName);
    return null;
  }
);

export const unfollowAction = action$(
  // @ts-ignore Types aren't aligned yet
  async (_, { request, params, platform }: HandlerParams) => {
    const auth = await authenticate(platform, request);
    if (auth.status === "unauthenticated") return null;

    const crowdDO = client(request, platform.CROWD_DO, params.username);
    const userDO = client(request, platform.USER_DO, auth.payload.sub);

    const user = await call(userDO, "details");

    await call(crowdDO, "unfollow", params.username, user.userName);
    return null;
  }
);
