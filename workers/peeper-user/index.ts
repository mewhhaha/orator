import { CallableDurableObject, respond } from "doit";

export type UserDetails = {
  userName: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  profileImage: string;
  bannerImage: string;
  description: string;
};

type Env = {
  USER_KV: KVNamespace;
};

export class PeeperUser extends CallableDurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    state.blockConcurrencyWhile(async () => {
      const value = await this.state.storage.get<UserDetails>("latest");
      if (value === undefined) {
        const now = new Date();
        const details = {
          userName: "ooze",
          displayName: "ooze",
          createdAt: now,
          updatedAt: now,
          description: "",
          profileImage:
            "https://pbs.twimg.com/profile_images/1578797224368250880/Gfug3lp7_400x400.jpg",
          bannerImage:
            "https://pbs.twimg.com/profile_images/1578797224368250880/Gfug3lp7_400x400.jpg",
        };

        await Promise.all([
          this.state.storage.put<UserDetails>("latest", details),
          this.state.storage.put<UserDetails>(
            `date#${details.updatedAt.toISOString()}`,
            details
          ),
          this.env.USER_KV.put(details.userName, JSON.stringify(details)),
        ]);
      }
    });
  }

  async details(_: Request) {
    const value = await this.state.storage.get<UserDetails>("latest");
    return respond(value);
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
};
