import { getPublicContent } from "@/lib/services/content";
import { Container } from "@/components/common/container";
export async function CommunityAnnouncement() {
  const content = await getPublicContent();
  return content["homepage.announcement"] ? <Container className="py-4"><aside className="rounded-2xl bg-brand-gold p-4 text-center text-sm">{content["homepage.announcement"]}</aside></Container> : null;
}

export async function CommunityIntroduction() {
  const content = await getPublicContent();
  return content["community.introduction"] ? <Container className="py-8"><p className="mx-auto max-w-3xl text-center text-brand-secondary">{content["community.introduction"]}</p></Container> : null;
}
