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
  console.log(1);
  const postDO = client(request, platform.POST_DO, id);
  console.log(2);
  const crowdDO = client(request, platform.CROWD_DO, fakeAuthor);
  console.log(3);
  const timelineDO = client(request, platform.TIMELINE_DO, fakeAuthor);
  console.log(4);
  const post = await call(postDO, "write", fakeAuthor, text);
  console.log(5);
  await Promise.all([
    call(crowdDO, "deliver", post),
    call(timelineDO, "add", post),
  ]);
  console.log(6);
  console.log(7);

  return post;
};
