import { CallableDurableObject } from "doit";

type Env = never;

export class OratorSettings extends CallableDurableObject<Env> {}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
