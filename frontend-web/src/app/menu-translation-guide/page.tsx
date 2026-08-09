import PublisherPage from "@/components/PublisherPage";
import { publisherPageMetadata } from "@/lib/publisherPages";

export const metadata = publisherPageMetadata("guide");

export default function MenuTranslationGuidePage() {
  return <PublisherPage pageKey="guide" />;
}
