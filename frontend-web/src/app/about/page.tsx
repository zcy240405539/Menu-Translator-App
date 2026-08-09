import PublisherPage from "@/components/PublisherPage";
import { publisherPageMetadata } from "@/lib/publisherPages";

export const metadata = publisherPageMetadata("about");

export default function AboutPage() {
  return <PublisherPage pageKey="about" />;
}
