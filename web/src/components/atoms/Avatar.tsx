import { component$ } from "@builder.io/qwik";

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
