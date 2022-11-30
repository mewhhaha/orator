import { CallableDurableObject, error, respond } from "doit";
import { Post } from "wtypes";

type Env = {
  POST_KV: KVNamespace;
};

export class OratorPost extends CallableDurableObject<Env> {
  async write(_: Request, author: string, text: string) {
    if (this.state.storage.get("post") !== undefined) {
      return error("Conflict", 409);
    }

    const now = new Date();
    const metadata = { id: this.state.id.toString(), createdAt: now, author };
    const post: Post = { text, ...metadata };

    await this.state.storage.put("post", post);
    this.env.POST_KV.put(this.state.id.toString(), post.text, {
      metadata: post,
    });

    return respond(post);
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
