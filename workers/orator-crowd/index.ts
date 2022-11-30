import { CallableDurableObject, respond, Serialized } from "doit";
import { Post } from "wtypes";
import { invertDate } from "wutils";

type Env = {
  FEED_KV: KVNamespace;
};

export class OratorCrowd extends CallableDurableObject<Env> {
  join(_: Request, userId: string) {
    this.state.storage.put(userId, true, { allowConcurrency: true });
    return respond("ok");
  }

  leave(_: Request, userId: string) {
    this.state.storage.put(userId, false, { allowConcurrency: true });
    return respond("ok");
  }

  deliver(_: Request, post: Serialized<Post>) {
    const invertedDate = invertDate(post.createdAt);

    this.state.storage
      .list<boolean>({ allowConcurrency: true })
      .then(async (m) => {
        for (const [userId, active] of m.entries()) {
          if (!active) continue;

          try {
            await this.env.FEED_KV.put(
              `${userId}#${invertedDate}#${post.id}`,
              post.id,
              { metadata: post }
            );
          } catch (e) {
            console.error(e);
          }
        }
      });

    return respond("ok");
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
