import PublisherPage from "@/components/PublisherPage";
import { publisherPageMetadata } from "@/lib/publisherPages";

export const metadata = publisherPageMetadata("languages");

export default function SupportedLanguagesPage() {
  return <PublisherPage pageKey="languages" />;
}
