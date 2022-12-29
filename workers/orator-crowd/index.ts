import { CallableDurableObject, error, respond, Serialized } from "doit";
import { Post } from "wtypes";
import { invertDate } from "wutils";

type Env = {
  FEED_KV: KVNamespace;
  CROWD_KV: KVNamespace;
};

export class OratorCrowd extends CallableDurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async following(_: Request, userId: string) {
    const value = await this.state.storage.get<boolean>(userId);
    return respond(value === true);
  }

  async follow(_: Request, crowdId: string, userId: string) {
    const date = new Date();

    const metadata = { metadata: { updatedAt: date, status: "following" } };
    this.env.CROWD_KV.put(followers(crowdId, userId), "true", { metadata });
    this.env.CROWD_KV.put(following(crowdId, userId), "true", { metadata });

    await this.state.storage.put(userId, true, { allowConcurrency: true });

    return respond("ok");
  }

  async unfollow(_: Request, crowdId: string, userId: string) {
    const date = new Date().toISOString();

    const metadata = { metadata: { updatedAt: date, status: "unfollowed" } };
    this.env.CROWD_KV.put(followers(crowdId, userId), "false", { metadata });
    this.env.CROWD_KV.put(following(crowdId, userId), "false", { metadata });

    await this.state.storage.put(userId, false, { allowConcurrency: true });
    return respond("ok");
  }

  deliver(_: Request, post: Serialized<Post>) {
    const invertedDate = invertDate(post.createdAt);

    if (invertedDate === undefined) {
      return error("invalid post date", 422);
    }

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

const followers = (crowdId: string, userId: string) =>
  `followers#${crowdId}#${userId}`;
const following = (crowdId: string, userId: string) =>
  `following#${userId}#${crowdId}`;
