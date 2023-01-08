import { component$, Slot } from "@builder.io/qwik";
import { DocumentHead, loader$ } from "@builder.io/qwik-city";
import { JSX } from "@builder.io/qwik/jsx-runtime";
import { call, client } from "doit";
import { NavLink } from "~/components/atoms/NavLink";
import { authenticate, HandlerParams } from "~/helpers";

export const loader = loader$(async ({ platform, request }: HandlerParams) => {
  const auth = await authenticate(platform, request);
  if (auth.status === "unauthenticated") {
    return null;
  }

  const c = client(request, platform.USER_DO, auth.payload.sub);
  return await call(c, "details");
});

export const head: DocumentHead = {
  title: "Peeper",
};

export default component$(() => {
  const data = loader.use();

  return (
    <div class="absolute inset-0 overflow-auto">
      <div class="mx-auto flex h-full w-full max-w-5xl">
        <header class="w-18 sticky top-0 flex-none border-r border-gray-700 lg:w-48">
          <nav class="flex flex-col gap-4 p-4">
            {data.value !== null && (
              <>
                <MenuLink
                  href="/home"
                  icon={<HomeIcon class="h-8 w-8 text-gray-300" />}
                  title="Home"
                />
                <MenuLink
                  href={`/${data.value.userName}`}
                  icon={<ProfileIcon class="h-8 w-8 text-gray-300" />}
                  title="Profile"
                />
              </>
            )}
          </nav>
        </header>
        <main class="flex-grow">
          <Slot />
        </main>
        <footer class="sticky top-0 w-0 flex-none border-l border-gray-700 sm:w-32 lg:w-48">
          I'm a footer
        </footer>
      </div>
    </div>
  );
});

type MenuLinkProps = {
  title: string;
  href: string;
  icon: JSX.Element;
};

export const MenuLink = ({ title, href, icon }: MenuLinkProps) => {
  return (
    <NavLink
      class="w-min rounded-full p-2 transition-colors hover:bg-white/10 lg:px-4"
      href={href}
    >
      <div class="lg:grid lg:grid-cols-[3rem,auto]">
        {icon}
        <div class="hidden group-aria-[current=page]:font-bold lg:block">
          {" "}
          <div class="flex h-full items-center">{title}</div>
        </div>
      </div>
    </NavLink>
  );
};

export const HomeIcon = component$((props: JSX.IntrinsicElements["div"]) => {
  return (
    <div {...props}>
      <HomeIconFilled class="inset-0 hidden  group-aria-[current=page]:block" />
      <HomeIconOutlined class="inset-0 block group-aria-[current=page]:hidden" />
    </div>
  );
});

export const ProfileIcon = component$((props: JSX.IntrinsicElements["div"]) => {
  return (
    <div {...props}>
      <ProfileIconFilled class="inset-0 hidden group-aria-[current=page]:block" />
      <ProfileIconOutlined class="inset-0 block group-aria-[current=page]:hidden" />
    </div>
  );
});

export const HomeIconFilled = (props: JSX.IntrinsicElements["svg"]) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
  </svg>
);

export const HomeIconOutlined = (props: JSX.IntrinsicElements["svg"]) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    {...props}
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

export const ProfileIconFilled = (props: JSX.IntrinsicElements["svg"]) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path
      fill-rule="evenodd"
      d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      clip-rule="evenodd"
    />
  </svg>
);

export const ProfileIconOutlined = (props: JSX.IntrinsicElements["svg"]) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    {...props}
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);
