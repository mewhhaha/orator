import { RequestEvent } from "@builder.io/qwik-city";
import { DurableObjectNamespaceIs } from "doit";
import { OratorSettings } from "orator-settings";
import { OratorPost } from "orator-post";
import { OratorTimeline } from "orator-timeline";
import { OratorCrowd } from "orator-crowd";

export type Platform = {
  GAME_BUCKET: R2Bucket;
  TIMELINE_DO: DurableObjectNamespaceIs<OratorTimeline>;
  TIMELINE_KV: KVNamespace;
  SETTINGS_DO: DurableObjectNamespaceIs<OratorSettings>;
  CROWD_DO: DurableObjectNamespaceIs<OratorCrowd>;
  FEED_KV: KVNamespace;
  POST_DO: DurableObjectNamespaceIs<OratorPost>;
  POST_KV: KVNamespace;
};

export type HandlerArgs = Omit<RequestEvent<Platform>, "request"> & {
  request: Request;
};

export type EndpointData<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer V
  ? V extends Promise<infer W>
    ? W
    : V
  : never;
