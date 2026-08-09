import PublisherPage from "@/components/PublisherPage";
import { publisherPageMetadata } from "@/lib/publisherPages";

export const metadata = publisherPageMetadata("howItWorks");

export default function HowItWorksPage() {
  return <PublisherPage pageKey="howItWorks" />;
}
