import { component$, Slot } from "@builder.io/qwik";
import { Link, LinkProps, useLocation } from "@builder.io/qwik-city";

type NavLinkProps = LinkProps;

export const NavLink = component$((props: NavLinkProps) => {
  const location = useLocation();
  const match = props.href ? location.pathname.startsWith(props.href) : false;

  return (
    <Link
      {...props}
      aria-current={match ? "page" : undefined}
      class={[props.class?.toString(), "group"]}
    >
      <Slot />
    </Link>
  );
});
