import { component$ } from "@builder.io/qwik";
import { HandlerArgs } from "~/helpers";

export const onGet = ({ response }: HandlerArgs) => {
  throw response.redirect("/home", 302);
};

export default component$(() => <></>);
