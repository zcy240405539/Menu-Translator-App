import PublisherPage from "@/components/PublisherPage";
import { publisherPageMetadata } from "@/lib/publisherPages";

export const metadata = publisherPageMetadata("examples");

export default function MenuExamplesPage() {
  return <PublisherPage pageKey="examples" />;
}
