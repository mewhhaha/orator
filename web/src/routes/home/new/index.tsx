import { call, client } from "doit";
import { HandlerArgs } from "~/helpers";

const fakeAuthor = "me";

export const onPost = async ({ request, platform, response }: HandlerArgs) => {
  const formData = await request.formData();
  const text = formData.get("text")?.toString();
  if (!text) {
    throw response.error(422);
  }

  const id = platform.POST_DO.newUniqueId();
  const postDO = client(request, platform.POST_DO, id);
  const crowdDO = client(request, platform.CROWD_DO, fakeAuthor);
  const timelineDO = client(request, platform.TIMELINE_DO, fakeAuthor);
  const post = await call(postDO, "write", fakeAuthor, text);
  await Promise.all([
    call(crowdDO, "deliver", post),
    call(timelineDO, "add", post),
  ]);

  return post;
};
