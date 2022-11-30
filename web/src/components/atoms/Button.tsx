import { component$, Slot } from "@builder.io/qwik";

export type ButtonVariant = "solid" | "outline" | "text";

export type ButtonProps = {
  onClick?: () => void;
  variant?: ButtonVariant;
};

export const Button = component$((props: ButtonProps) => {
  const variant = props.variant === undefined ? "solid" : props.variant;
  return (
    <button
      class={{
        "px-2 py-1 font-display": true,
        "border-4 border-gray-900 bg-gray-900 text-white hover:bg-lime-400 hover:text-gray-900":
          variant === "solid",
        "border-4 border-gray-900 text-gray-900 hover:bg-lime-400":
          variant === "outline",
      }}
      onClick$={props.onClick}
    >
      <Slot />
    </button>
  );
});
