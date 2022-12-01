import { CallableDurableObject, error, respond, Serialized } from "doit";
import { invertDate } from "wutils";
import { Post } from "wtypes";

type Env = {
  TIMELINE_KV: KVNamespace;
};

export class OratorTimeline extends CallableDurableObject<Env> {
  async add(_: Request, post: Serialized<Post>) {
    const invertedDate = invertDate(post.createdAt);
    if (invertedDate === undefined) {
      return error("invalid post date", 422);
    }

    this.env.TIMELINE_KV.put(
      `${post.author}#${invertedDate}#${post.id}`,
      post.id,
      {
        metadata: post,
      }
    );

    const previous = await this.state.storage.get<number>("count");
    this.state.storage.put<number>("count", (previous ?? 0) + 1);

    return respond("ok");
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
