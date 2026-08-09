import PublisherPage from "@/components/PublisherPage";
import { publisherPageMetadata } from "@/lib/publisherPages";

export const metadata = publisherPageMetadata("contact");

export default function ContactPage() {
  return <PublisherPage pageKey="contact" />;
}
