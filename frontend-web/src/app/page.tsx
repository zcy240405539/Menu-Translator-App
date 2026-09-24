import HomePage from "@/components/HomePage";
import { DEFAULT_LANGUAGE, getText } from "@/lib/i18n";

export default function Page() {
  return (
    <HomePage
      initialLanguage={DEFAULT_LANGUAGE}
      initialText={getText(DEFAULT_LANGUAGE)}
    />
  );
}
