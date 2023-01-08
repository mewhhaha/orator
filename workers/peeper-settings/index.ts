import { CallableDurableObject } from "doit";

type Env = never;

export class PeeperSettings extends CallableDurableObject<Env> {}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
