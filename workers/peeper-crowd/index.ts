import { CallableDurableObject, error, respond, Serialized } from "doit";
import { Post } from "wtypes";
import { invertDate } from "wutils";

type Env = {
  FEED_KV: KVNamespace;
  CROWD_KV: KVNamespace;
};

export class PeeperCrowd extends CallableDurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async following(_: Request, userName: string) {
    const value = await this.state.storage.get<boolean>(userName);
    return respond(value === true);
  }

  async follow(_: Request, userName: string, followerName: string) {
    const date = new Date();

    const metadata = { metadata: { updatedAt: date, status: "following" } };
    this.env.CROWD_KV.put(followers(userName, followerName), "true", metadata);
    this.env.CROWD_KV.put(following(userName, followerName), "true", metadata);

    await this.state.storage.put(followerName, true, {
      allowConcurrency: true,
    });

    return respond("ok");
  }

  async unfollow(_: Request, userName: string, followerName: string) {
    const date = new Date().toISOString();

    const metadata = { metadata: { updatedAt: date, status: "unfollowed" } };
    this.env.CROWD_KV.put(followers(userName, followerName), "false", metadata);
    this.env.CROWD_KV.put(following(userName, followerName), "false", metadata);

    await this.state.storage.put(followerName, false, {
      allowConcurrency: true,
    });
    return respond("ok");
  }

  deliver(_: Request, post: Serialized<Post>) {
    try {
      this.state.storage
        .list<boolean>({ allowConcurrency: true })
        .then(async (m) => {
          for (const [userName, active] of m.entries()) {
            if (!active) continue;

            try {
              await this.env.FEED_KV.put(feed(userName, post), post.id, {
                metadata: post,
              });
            } catch (e) {
              console.error(e);
            }
          }
        });

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

const followers = (crowdId: string, userName: string) =>
  `followers#${crowdId}#${userName}`;
const following = (crowdId: string, userName: string) =>
  `following#${userName}#${crowdId}`;

const feed = (userName: string, post: Serialized<Post>) => {
  return `${userName}#${invertDate(post.createdAt)}#${post.id}`;
};
