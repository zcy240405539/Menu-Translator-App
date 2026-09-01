import type { Metadata } from "next";
import AccountPage from "@/components/AccountPage";
import { getText } from "@/lib/i18n";

const text = getText("en");

export const metadata: Metadata = {
  title: `${text.nav.account} - ${text.common.brand}`,
  description: text.settings.accountDescription,
  robots: { index: false, follow: false },
};

export default function AccountRoute() {
  return <AccountPage />;
}
