import { component$, Slot } from "@builder.io/qwik";
import { JSX } from "@builder.io/qwik/jsx-runtime";

type FormProps = Omit<JSX.IntrinsicElements["form"], "method" | "encType"> & {
  method?: "post" | "get" | "multipart";
  encType?: "multipart/form-data" | "application/x-www-form-urlencoded";
};

export const Form = component$<FormProps>(
  ({ encType = "application/x-www-form-urlencoded", ...props }) => {
    return (
      <form
        preventdefault:submit
        onSubmit$={async (e) => {
          const f = e.target as HTMLFormElement;
          const entries: [string, string][] = [];
          const formData = new FormData(f);
          for (const [key, value] of formData.entries()) {
            entries.push([key, value.toString()]);
          }

          const search = new URLSearchParams(entries).toString();
          switch (f.method) {
            case "multipart": {
              await fetch(f.action, {
                method: "POST",
                body: formData,
              });
              break;
            }
            case "post": {
              await fetch(f.action, {
                method: "POST",
                body: encType === "multipart/form-data" ? formData : search,
                headers:
                  encType === "multipart/form-data"
                    ? undefined
                    : {
                        "Content-Type": "application/x-www-form-urlencoded",
                      },
              });
              break;
            }

            case "get": {
              await fetch(`${f.action}?${search}`);
              break;
            }
          }
        }}
        {...props}
      >
        <Slot />
      </form>
    );
  }
);
