import { DurableObjectNamespaceIs } from "doit";
import { PeeperSettings } from "peeper-settings";
import { PeeperPost } from "peeper-post";
import { PeeperTimeline } from "peeper-timeline";
import { PeeperCrowd } from "peeper-crowd";
import { PeeperUser } from "peeper-user";
import { loader$ } from "@builder.io/qwik-city";

export type Platform = {
  GAME_BUCKET: R2Bucket;
  TIMELINE_DO: DurableObjectNamespaceIs<PeeperTimeline>;
  TIMELINE_KV: KVNamespace;
  SETTINGS_DO: DurableObjectNamespaceIs<PeeperSettings>;
  CROWD_DO: DurableObjectNamespaceIs<PeeperCrowd>;
  CROWD_KV: KVNamespace;
  FEED_KV: KVNamespace;
  POST_DO: DurableObjectNamespaceIs<PeeperPost>;
  POST_KV: KVNamespace;
  USER_DO: DurableObjectNamespaceIs<PeeperUser>;
  USER_KV: KVNamespace;

  AUTH_DOMAIN: string;
  AUTH_AUD: string;
  AUTH_DEV?: string;
};

export type EndpointData<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer V
  ? V extends Promise<infer W>
    ? W
    : V
  : never;

export type HandlerParams = Parameters<
  Parameters<typeof loader$<Platform, any>>[0]
>[0];
