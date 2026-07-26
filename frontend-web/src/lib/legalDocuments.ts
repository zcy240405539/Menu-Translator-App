import { getText, webText, type WebLanguageCode } from "@/lib/i18n";

export type LegalKind = "privacy" | "terms";

export type LegalDocument = {
  title: string;
  intro: string;
  sections: { heading: string; items: string[] }[];
};

export const documents = Object.fromEntries(
  Object.entries(webText).map(([language, catalog]) => [language, catalog.legalDocuments])
) as Record<WebLanguageCode, Record<LegalKind, LegalDocument>>;

export function getLegalDocument(lang: WebLanguageCode, kind: LegalKind) {
  return getText(lang).legalDocuments[kind];
}
