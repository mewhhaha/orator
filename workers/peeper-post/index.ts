import { CallableDurableObject, error, respond } from "doit";
import { Post } from "wtypes";

type Env = {
  POST_KV: KVNamespace;
};

export class PeeperPost extends CallableDurableObject<Env> {
  async write(
    _: Request,
    { userName, profileImage }: { userName: string; profileImage: string },
    text: string
  ) {
    if ((await this.state.storage.get("post")) !== undefined) {
      return error("Conflict", 409);
    }

    const now = new Date();
    const metadata = {
      id: this.state.id.toString(),
      createdAt: now,
      userName,
      profileImage,
    };
    const post: Post = { text, ...metadata };

    await this.state.storage.put("post", post);
    const options = { metadata: post };
    this.env.POST_KV.put(post.id, post.text, options);

    return respond(post);
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
