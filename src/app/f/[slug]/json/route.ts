import { renderPublicFeed } from "../../../../lib/feed/public-feed-access.ts";

type Context = { params: Promise<{ slug: string }> };
export async function GET(request: Request, context: Context) {
  return renderPublicFeed(request, (await context.params).slug, "json");
}
