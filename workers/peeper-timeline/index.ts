import { CallableDurableObject, error, respond, Serialized } from "doit";
import { invertDate } from "wutils";
import { Post } from "wtypes";

type Env = {
  TIMELINE_KV: KVNamespace;
  FEED_KV: KVNamespace;
};

export class PeeperTimeline extends CallableDurableObject<Env> {
  async add(_: Request, post: Serialized<Post>) {
    try {
      const options = { metadata: post };
      await this.env.TIMELINE_KV.put(timeline(post), post.id, options);
      await this.env.FEED_KV.put(timeline(post), post.id, options);

      const previous = await this.state.storage.get<number>("count");
      this.state.storage.put<number>("count", (previous ?? 0) + 1);

      return respond("ok");
    } catch {
      return error("invalid post date", 422);
    }
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};

const timeline = (post: Serialized<Post>) => {
  return `${post.userName}#${invertDate(post.createdAt)}#${post.id}`;
};
